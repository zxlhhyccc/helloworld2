#!/bin/sh

# 引入公共方法
. /usr/share/ssr-plus2/utils.sh


# 取出索引
ruleIndex=$1

# 取出 cfgid
cfgid=$2

# 输出
# echo "cfgid:${cfgid}"


# 获取参数
# 地址
server=$(uci_get_by_name ${cfgid} server)
# 端口
server_port=$(uci_get_by_name ${cfgid} server_port)


id=$(uci_get_by_name ${cfgid} vless_id)
encryption=$(uci_get_by_name ${cfgid} vless_encryption)
flow=$(uci_get_by_name ${cfgid} vless_flow)


stream_network=$(uci_get_by_name ${cfgid} vless_stream_network)

stream_network_settings=""

case "${stream_network}" in
tcp)
    accept_proxy_protocol=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_accept_proxy_protocol)
    accept_proxy_protocol_str=""
    if [ "${accept_proxy_protocol}" == "1" ]; then
        # 开启
        accept_proxy_protocol_str=true
    else
        # 关闭
        accept_proxy_protocol_str=false
    fi
    
    
    header;
    
    type=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_type)
    if [ "${type}" != "http" ]; then
        # 非 http
        header='{"type": "none"}'
    else
        # http
        # request
        request_version=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_version "1.1")
        request_method=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_method "GET")
        request_path=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_path '["/"]')
        request_headers=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_headers "{}")
        
        request="{\"version\": "${request_version}", \"method\": "${request_method}", \"path\": ${request_path}, \"headers\": ${request_headers}"
        
        
        # response
        response_version=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_version "1.1")
        response_status=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_status "200")
        response_reason=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_reason "OK")
        response_headers=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_headers "{}")

        response="{\"version\": "${response_version}", \"status\": "${response_status}", \"reason\": ${response_reason}, \"headers\": ${response_headers}"
        
        
        header="{\"type\": \"http\", \"request\": ${request}, \"response\": ${response}}"
    fi
    
    stream_network_settings="\"rawSettings\": {
                                \"acceptProxyProtocol\": ${accept_proxy_protocol_str}, 
                                \"header\": ${header}
                              }"
    ;;
xhttp)
    host=$(uci_get_by_name ${cfgid} vless_stream_network_xhttp_host)
    path=$(uci_get_by_name ${cfgid} vless_stream_network_xhttp_path)
    mode=$(uci_get_by_name ${cfgid} vless_stream_network_xhttp_mode)
    extra=$(uci_get_by_name ${cfgid} vless_stream_network_xhttp_extra "{}")


    stream_network_settings="\"xhttpSettings\": {
                                \"host\": \"${host}\", 
                                \"path\": \"${path}\",
                                \"mode\": \"${mode}\",
                                \"extra\": ${extra}
                              }"
    ;;
kcp)
    mtu=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_mtu 1350)
    tti=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_tti 50)
    uplink_capacity=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_uplink_capacity 5)
    downlink_capacity=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_downlink_capacity 20)
    congestion=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_congestion)
    congestion_str=""
    if [ "${congestion}" == "1" ]; then
        # 开启
        congestion_str=true
    else
        # 关闭
        congestion_str=false
    fi
    
    read_buffer_size=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_read_buffer_size 2)
    write_buffer_size=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_write_buffer_size 2)
    
    
    stream_network_settings="\"kcpSettings\": {
                                \"mtu\": ${mtu},
                                \"tti\": ${tti},
                                \"uplinkCapacity\": ${uplink_capacity},
                                \"downlinkCapacity\": ${downlink_capacity},
                                \"congestion\": ${congestion_str},
                                \"readBufferSize\": ${read_buffer_size},
                                \"writeBufferSize\": ${write_buffer_size}
                             }"
    ;;
ws)
    accept_proxy_protocol=$(uci_get_by_name ${cfgid} vless_stream_network_ws_accep_proxy_protocol)
    accept_proxy_protocol_str=""
    if [ "${accept_proxy_protocol}" == "1" ]; then
        # 开启
        accept_proxy_protocol_str=true
    else
        # 关闭
        accept_proxy_protocol_str=false
    fi
    
    
    path=$(uci_get_by_name ${cfgid} vless_stream_network_ws_path "/")
    host=$(uci_get_by_name ${cfgid} vless_stream_network_ws_host)
    headers=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_headers "{}")
    heartbeat_period=$(uci_get_by_name ${cfgid} vless_stream_network_ws_heartbeat_period 10)
    
    
    stream_network_settings="\"wsSettings\": {
                            \"acceptProxyProtocol\": ${accept_proxy_protocol_str},
                            \"path\": \"${path}\",
                            \"host\": \"${host}\",
                            \"headers\": ${headers},
                            \"heartbeatPeriod\": ${heartbeat_period}
                          }"
    ;;
grpc)
    authority=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_authority)
    service_name=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_service_name)
    multi_mode=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_multi_mode)
    multi_mode_str=""
    if [ "${multi_mode}" == "1" ]; then
        # 开启
        multi_mode_str=true
    else
        # 关闭
        multi_mode_str=false
    fi
    
    user_agent=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_user_agent)
    idle_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_idle_timeout 60)
    health_check_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_health_check_timeout 20)
    permit_without_stream=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_permit_without_stream)
    permit_without_stream_str=""
    if [ "${permit_without_stream}" == "1" ]; then
        # 开启
        permit_without_stream_str=true
    else
        # 关闭
        permit_without_stream_str=false
    fi
    
    initial_windows_size=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_initial_windows_size 0)
    
    
    stream_network_settings="\"grpcSettings\": {
                              \"authority\": \"${authority}\",
                              \"serviceName\": \"${service_name}\",
                              \"multiMode\": ${multi_mode_str},
                              \"user_agent\": \"${user_agent}\",
                              \"idle_timeout\": ${idle_timeout},
                              \"health_check_timeout\": ${health_check_timeout},
                              \"permit_without_stream\": ${permit_without_stream_str},
                              \"initial_windows_size\": ${initial_windows_size}
                            }"
    ;;
httpupgrade)
    accept_proxy_protocol=$(uci_get_by_name ${cfgid} vless_stream_network_ws_accep_proxy_protocol)
    accept_proxy_protocol_str=""
    if [ "${accept_proxy_protocol}" == "1" ]; then
        # 开启
        accept_proxy_protocol_str=true
    else
        # 关闭
        accept_proxy_protocol_str=false
    fi
    host=$(uci_get_by_name ${cfgid} vless_stream_network_http_host)
    path=$(uci_get_by_name ${cfgid} vless_stream_network_http_path)
    headers=$(uci_get_by_name ${cfgid} vless_stream_network_http_headers "{}")
    
    
    stream_network_settings="\"httpupgradeSettings\": {
                                \"acceptProxyProtocol\": ${accept_proxy_protocol_str}, 
                                \"host\": ${host}, 
                                \"path\": \"${path}\", 
                                \"headers\": ${headers}
                              }"
    ;;
hysteria)
    version=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_version)
    auth=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_auth)
    up=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_up 0)
    down=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_down 0)
    udphop_port=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_udphop_port "1145-1919")
    udphop_interval=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_udphop_interval 30)
    init_stream_receive_window=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_init_stream_receive_window)
    if [ "${init_stream_receive_window}" != "" ]; then
        init_stream_receive_window="\"initStreamReceiveWindow\": ${init_stream_receive_window},"
    fi
    
    max_stream_receive_window=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_max_stream_receive_window)
    if [ "${max_stream_receive_window}" != "" ]; then
        max_stream_receive_window="\"maxStreamReceiveWindow\": ${max_stream_receive_window},"
    fi
    
    init_connection_receive_window=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_init_connection_receive_window)
    if [ "${init_connection_receive_window}" != "" ]; then
        init_connection_receive_window="\"initConnectionReceiveWindow\": ${init_connection_receive_window},"
    fi    
    
    max_connection_receive_window=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_max_connection_receive_window)
    if [ "${max_connection_receive_window}" != "" ]; then
        max_connection_receive_window="\"maxConnectionReceiveWindow\": ${max_connection_receive_window},"
    fi


    max_idle_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_max_idle_timeout 30)
    keep_alive_period=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_keep_alive_period 0)
    disable_path_mtu_discovery=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_disable_path_mtu_discovery)
    disable_path_mtu_discovery_str=""
    if [ "${disable_path_mtu_discovery}" == "1" ]; then
        # 开启
        disable_path_mtu_discovery_str=true
    else
        # 关闭
        disable_path_mtu_discovery_str=false
    fi
    
    
    stream_network_settings="\"hysteriaSettings\": {
                                  \"version\": 2,
                                  \"auth\": \"${auth}\",
                                  \"up\": \"${up}\",
                                  \"down\": \"${down}\",
                                  \"udphop\": {
                                    \"port\": \"${udphop_port}\",
                                    \"interval\": ${udphop_interval}
                                  },
                                  ${init_stream_receive_window}
                                  ${max_stream_receive_window}
                                  ${init_connection_receive_window}
                                  ${max_connection_receive_window}
                                  \"maxIdleTimeout\": ${max_idle_timeout},
                                  \"keepAlivePeriod\": ${keep_alive_period},
                                  \"disablePathMTUDiscovery\": ${disable_path_mtu_discovery_str}
                                }"
    ;;
*)
    stream_network_settings=""
esac

if [ "${stream_network_settings}" != "" ]; then
    stream_network_settings="${stream_network_settings},"
fi


stream_security=$(uci_get_by_name ${cfgid} vless_stream_security)

tls_settings=""
if [ "${stream_security}" == "tls" ]; then
    server_name=$(uci_get_by_name ${cfgid} vless_stream_tls_server_name)
    verify_peer_cert_by_name=$(uci_get_by_name ${cfgid} vless_stream_tls_verify_peer_cert_by_name)
    vless_stream_tls_reject_unknown_sni=$(uci_get_by_name ${cfgid} vless_stream_tls_reject_unknown_sni)
    vless_stream_tls_reject_unknown_sni_str=""
    if [ "${vless_stream_tls_reject_unknown_sni}" == "1" ]; then
        # 开启
        vless_stream_tls_reject_unknown_sni_str=true
    else
        # 关闭
        vless_stream_tls_reject_unknown_sni_str=false
    fi
    
    allow_insecure=$(uci_get_by_name ${cfgid} vless_stream_tls_allow_insecure)
    allow_insecure_str=""
    if [ "${allow_insecure}" == "1" ]; then
        # 开启
        allow_insecure_str=true
    else
        # 关闭
        allow_insecure_str=false
    fi    
    
    alpn=$(uci_get_by_name ${cfgid} vless_stream_tls_alpn '["h2", "http/1.1"]')
    min_version=$(uci_get_by_name ${cfgid} vless_stream_tls_min_version '1.2')
    max_version=$(uci_get_by_name ${cfgid} vless_stream_tls_max_version '1.3')
    cipher_suites=$(uci_get_by_name ${cfgid} vless_stream_tls_cipher_suites)
    certificates=$(uci_get_by_name ${cfgid} vless_stream_tls_certificates '[]')
    disable_system_root=$(uci_get_by_name ${cfgid} vless_stream_tls_disable_system_root)
    disable_system_root_str=""
    if [ "${disable_system_root}" == "1" ]; then
        # 开启
        disable_system_root_str=true
    else
        # 关闭
        disable_system_root_str=false
    fi    
    
    enable_ssession_resumption=$(uci_get_by_name ${cfgid} vless_stream_tls_enable_ssession_resumption)
    enable_ssession_resumption_str=""
    if [ "${enable_ssession_resumption}" == "1" ]; then
        # 开启
        enable_ssession_resumption_str=true
    else
        # 关闭
        enable_ssession_resumption_str=false
    fi   
    
    fingerprint=$(uci_get_by_name ${cfgid} vless_stream_tls_fingerprint)
    pinned_peer_cert_sha256=$(uci_get_by_name ${cfgid} vless_stream_tls_pinned_peer_cert_sha256)
    curve_preferences=$(uci_get_by_name ${cfgid} vless_stream_tls_curve_preferences "[]")
    master_key_log=$(uci_get_by_name ${cfgid} vless_stream_tls_master_key_log)
    ech_server_keys=$(uci_get_by_name ${cfgid} vless_stream_tls_ech_server_keys)
    ech_config_list=$(uci_get_by_name ${cfgid} vless_stream_tls_ech_config_list)
    ech_force_query=$(uci_get_by_name ${cfgid} vless_stream_tls_ech_force_query)

    
    pinned_peer_certificate_chain_sha256=$(uci_get_by_name ${cfgid} vmess_stream_tls_pinned_peer_certificate_chain_sha256)
    
    
    tls_settings=",
                \"tlsSettings\": 
                 {
                  \"serverName\": \"${server_name}\",
                  \"verifyPeerCertByName\": \"${verify_peer_cert_by_name}\",
                  \"rejectUnknownSni\": ${vless_stream_tls_reject_unknown_sni_str},
                  \"allowInsecure\": ${allow_insecure_str},
                  \"alpn\": ${alpn},
                  \"minVersion\": \"${min_version}\",
                  \"maxVersion\": \"${max_version}\",
                  \"cipherSuites\": \"${cipher_suites}\",
                  \"certificates\": ${certificates},
                  \"disableSystemRoot\": ${disable_system_root_str},
                  \"enableSessionResumption\": ${enable_ssession_resumption_str},
                  \"fingerprint\": \"${fingerprint}\",
                  \"pinnedPeerCertSha256\": \"${pinned_peer_cert_sha256}\",
                  \"curvePreferences\": ${curve_preferences},
                  \"masterKeyLog\": \"${master_key_log}\",
                  \"echServerKeys\": \"${ech_server_keys}\",
                  \"echConfigList\": \"${ech_config_list}\",
                  \"echForceQuery\": \"${ech_force_query}\"
                }"
fi

reality_settings=""
if [ "${stream_security}" == "reality" ]; then
    show=$(uci_get_by_name ${cfgid} vless_stream_reality_show)
    show_str=""
    if [ "${show}" == "1" ]; then
        # 开启
        show_str=true
    else
        # 关闭
        show_str=false
    fi
    
    target=$(uci_get_by_name ${cfgid} vless_stream_reality_target)
    xver=$(uci_get_by_name ${cfgid} vless_stream_reality_xver 0)
    server_names=$(uci_get_by_name ${cfgid} vless_stream_reality_server_names "[]")
    private_key=$(uci_get_by_name ${cfgid} vless_stream_reality_private_key)
    min_client_ver=$(uci_get_by_name ${cfgid} vless_stream_reality_min_client_ver)
    max_client_ver=$(uci_get_by_name ${cfgid} vless_stream_reality_max_client_ver)
    max_time_diff=$(uci_get_by_name ${cfgid} vless_stream_reality_max_time_diff 1000)
    short_ids=$(uci_get_by_name ${cfgid} vless_stream_reality_short_ids "[]")
    mldsa65Seed=$(uci_get_by_name ${cfgid} vless_stream_reality_mldsa65Seed)
    limit_fallback_upload_after_bytes=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_upload_after_bytes 0)
    limit_fallback_upload_bytes_per_sec=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_upload_bytes_per_sec 0)
    limit_fallback_upload_burst_bytes_per_sec=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_upload_burst_bytes_per_sec 0)
    limit_fallback_download_after_bytes=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_download_after_bytes 0)
    limit_fallback_download_bytes_per_sec=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_download_bytes_per_sec 0)
    limit_fallback_download_burst_bytes_per_sec=$(uci_get_by_name ${cfgid} vless_stream_reality_limit_fallback_download_burst_bytes_per_sec 0)
    fingerprint=$(uci_get_by_name ${cfgid} vless_stream_reality_fingerprint)
    server_name=$(uci_get_by_name ${cfgid} vless_stream_reality_server_name)
    password=$(uci_get_by_name ${cfgid} vless_stream_reality_password)
    short_id=$(uci_get_by_name ${cfgid} vless_stream_reality_short_id)
    mldsa65_verify=$(uci_get_by_name ${cfgid} vless_stream_reality_mldsa65_verify)
    spider_x=$(uci_get_by_name ${cfgid} vless_stream_reality_spider_x)
    
    reality_settings=",
            \"realitySettings\": 
             {
              \"show\": ${show_str},
              // \"target\": \"${target}\",
              \"xver\": ${xver},
              \"serverNames\": ${server_names},
              \"privateKey\": \"${private_key}\",
              \"minClientVer\": \"${min_client_ver}\",
              \"maxClientVer\": \"${max_client_ver}\",
              \"maxTimeDiff\": ${max_time_diff},
              \"shortIds\": ${short_ids},
              \"mldsa65Seed\": \"${mldsa65Seed}\",
              \"limitFallbackUpload\": {
                \"afterBytes\": ${limit_fallback_upload_after_bytes},
                \"bytesPerSec\": ${limit_fallback_upload_bytes_per_sec},
                \"burstBytesPerSec\": ${limit_fallback_upload_burst_bytes_per_sec}
              },
              \"limitFallbackDownload\": {
                \"afterBytes\": ${limit_fallback_download_after_bytes},
                \"bytesPerSec\": ${limit_fallback_download_bytes_per_sec},
                \"burstBytesPerSec\": ${limit_fallback_download_burst_bytes_per_sec}
              },
              \"fingerprint\": \"${fingerprint}\",
              \"serverName\": \"${server_name}\",
              \"password\": \"${password}\",
              \"shortId\": \"${short_id}\",
              \"mldsa65Verify\": \"${mldsa65_verify}\",
              \"spiderX\": \"${spider_x}\"
            }"
fi

# 获取 socks5 端口
socks5Port=$(get_port)
# 获取 redirect 端口
redirectPort=$(get_port $((socks5Port+1)))

# 输出端口



# 输出配置文件
cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}.json"
{
    "log": {
        "loglevel": "info"
    },
    "inbounds": [
        {
            "port": ${socks5Port},
            "listen": "0.0.0.0",
            "protocol": "socks",
            "settings": {
                "udp": true
            }
        },
        {
            "port": ${redirectPort},
            "listen": "0.0.0.0",
            "protocol": "dokodemo-door",
            "settings": {
                "network": "tcp,udp",
                "followRedirect": true
            },
            "streamSettings": {
                "sockopt": {
                  "tproxy": "redirect"
                }
            }
        },
        {
            "port": ${redirectPort},
            "listen": "0.0.0.0",
            "protocol": "dokodemo-door",
            "settings": {
                "network": "tcp,udp",
                "followRedirect": true
            },
            "streamSettings": {
                "sockopt": {
                  "tproxy": "tproxy"
                }
            }
        }
    ],
    "outbounds": [
        {
            "protocol": "vless",
            "settings": {
                "vnext": [
                    {
                        "address": "${server}",
                        "port": ${server_port},
                        "users": [
                            {
                                "id": "${id}",
                                "encryption": "${encryption}",
                                "flow": "${flow}"
                            }
                        ]
                    }
                ]
            },
            "streamSettings": {
                "network": "${stream_network}",
                ${stream_network_settings}
                "security": "${stream_security}"${tls_settings}${reality_settings}
            }
        }
    ]
}
EOF

# 启动程序
xray -c ${TEMP_PATH}/proxy-${ruleIndex}.json > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &

# 进程号
pid=$!

# 休眠 1秒
sleep 1

# echo $pid
# 判断是否启动成功
count=`ps -ef | awk '{print $1}' | grep "${pid}" | wc -l`

#echo $count

if [ "${count}" == "0" ]; then
    # 启动失败
    # 返回空字符串
    echo ""
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
    
    # 返回 端口
    echo "${socks5Port},${redirectPort}"
fi