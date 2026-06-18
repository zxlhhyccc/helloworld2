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


id=$(uci_get_by_name ${cfgid} vmess_id)
alter_id=$(uci_get_by_name ${cfgid} vmess_alter_id)
security=$(uci_get_by_name ${cfgid} vmess_security)


stream_network=$(uci_get_by_name ${cfgid} vmess_stream_network)

stream_network_settings=""

case "${stream_network}" in
tcp)
    accept_proxy_protocol=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_accept_proxy_protocol)
    accept_proxy_protocol_str=""
    if [ "${accept_proxy_protocol}" == "1" ]; then
        # 开启
        accept_proxy_protocol_str=true
    else
        # 关闭
        accept_proxy_protocol_str=false
    fi
    
    
    header;
    
    type=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_type)
    if [ "${type}" != "http" ]; then
        # 非 http
        header='{"type": "none"}'
    else
        # http
        # request
        request_version=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_version "1.1")
        request_method=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_method "GET")
        request_path=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_path '["/"]')
        request_headers=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_headers "{}")
        
        request="{\"version\": "${request_version}", \"method\": "${request_method}", \"path\": ${request_path}, \"headers\": ${request_headers}"
        
        
        # response
        response_version=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_version "1.1")
        response_status=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_status "200")
        response_reason=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_reason "OK")
        response_headers=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_headers "{}")

        response="{\"version\": "${response_version}", \"status\": "${response_status}", \"reason\": ${response_reason}, \"headers\": ${response_headers}"
        
        
        header="{\"type\": \"http\", \"request\": ${request}, \"response\": ${response}}"
    fi
    
    stream_network_settings="\"tcpSettings\": {
                                \"acceptProxyProtocol\": ${accept_proxy_protocol_str}, 
                                \"header\": ${header}
                              }"
    ;;
kcp)
    mtu=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_mtu 1350)
    tti=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_tti 50)
    uplink_capacity=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_uplink_capacity 5)
    downlink_capacity=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_downlink_capacity 20)
    congestion=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_congestion)
    congestion_str=""
    if [ "${congestion}" == "1" ]; then
        # 开启
        congestion_str=true
    else
        # 关闭
        congestion_str=false
    fi
    
    read_buffer_size=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_read_buffer_size 2)
    write_buffer_size=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_write_buffer_size 2)
    header_type=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_header_type)
    seed=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_seed)
    
    
    stream_network_settings="\"kcpSettings\": {
                                \"mtu\": ${mtu}, 
                                \"tti\": ${tti}, 
                                \"uplinkCapacity\": ${uplink_capacity}, 
                                \"downlinkCapacity\": ${downlink_capacity}, 
                                \"congestion\": ${congestion_str}, 
                                \"readBufferSize\": ${read_buffer_size}, 
                                \"writeBufferSize\": ${write_buffer_size}, 
                                \"header\": {
                                    \"type\": \"${header_type}\"
                                }, 
                                \"seed\": \"${seed}\"
                             }"
    ;;
ws)
    accept_proxy_protocol=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_accep_proxy_protocol)
    accept_proxy_protocol_str=""
    if [ "${accept_proxy_protocol}" == "1" ]; then
        # 开启
        accept_proxy_protocol_str=true
    else
        # 关闭
        accept_proxy_protocol_str=false
    fi
    
    
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_path "/")
    headers=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_headers "{}")
    max_early_data=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_max_early_data 1024)
    use_browser_forwarding=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_use_browser_forwarding)
    use_browser_forwarding_str=""
    if [ "${use_browser_forwarding}" == "1" ]; then
        # 开启
        use_browser_forwarding_str=true
    else
        # 关闭
        use_browser_forwarding_str=false
    fi
    
    
    early_data_header_name=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_early_data_header_name)
    
    
    stream_network_settings="\"wsSettings\": {
                            \"acceptProxyProtocol\": ${accept_proxy_protocol_str}, 
                            \"path\": \"${path}\", 
                            \"headers\": ${headers}, 
                            \"maxEarlyData\": ${max_early_data}, 
                            \"useBrowserForwarding\": ${use_browser_forwarding_str}, 
                            \"earlyDataHeaderName\":\"${early_data_header_name}\"
                          }"
    ;;
http)
    host=$(uci_get_by_name ${cfgid} vmess_stream_network_http_host)
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_http_path)
    method=$(uci_get_by_name ${cfgid} vmess_stream_network_http_method)
    headers=$(uci_get_by_name ${cfgid} vmess_stream_network_http_headers)
    
    
    stream_network_settings="\"httpSettings\": {
                                \"host\": ${host}, 
                                \"path\": \"${path}\", 
                                \"method\":\"${method}\", 
                                \"headers\": ${headers}
                              }"
    ;;
quic)
    security=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_security)
    key=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_key)
    type=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_headers_type)
    
    stream_network_settings="\"quicSettings\": {
                                \"security\": \"${security}\", 
                                \"key\": \"${key}\", 
                                \"header\": {
                                    \"type\": \"${type}\"
                                 }
                              }"
    ;;
domainsocket)
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_path)
    
    abstract=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_abstract)
    abstract_str=""
    if [ "${abstract}" == "1" ]; then
        # 开启
        abstract_str=true
    else
        # 关闭
        abstract_str=false
    fi

    padding=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_padding)
    padding_str=""
    if [ "${padding}" == "1" ]; then
        # 开启
        padding_str=true
    else
        # 关闭
        padding_str=false
    fi
    
    
    stream_network_settings="\"dsSettings\": {
                                \"path\": \"${path}\", 
                                \"abstract\": ${abstract_str}, 
                                \"padding\": ${padding_str}
                              }"
    ;;
grpc)
    service_name=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_service_name)
    
    stream_network_settings="\"grpcSettings\": {
                                \"serviceName\": \"${service_name}\"
                              }"
    ;;
hysteria)
    password=$(uci_get_by_name ${cfgid} vmess_stream_network_hysteria_password)
    use_udp_extension=$(uci_get_by_name ${cfgid} vmess_stream_network_hysteria_use_udp_extension)
    use_udp_extension_str=""
    if [ "${use_udp_extension}" == "1" ]; then
        # 开启
        use_udp_extension_str=true
    else
        # 关闭
        use_udp_extension_str=false
    fi


    congestion_type=$(uci_get_by_name ${cfgid} vmess_stream_network_hysteria_congestion_type)
    congestion_up_mbps=$(uci_get_by_name ${cfgid} vmess_stream_network_hysteria_congestion_up_mbps)
    congestion_down_mbps=$(uci_get_by_name ${cfgid} vmess_stream_network_hysteria_congestion_down_mbps)
    
    stream_network_settings="\"hysteria2Settings\": {
                                    \"password\": \"${password}\", 
                                    \"use_udp_extension\": ${use_udp_extension_str}, 
                                    \"congestion\": {
                                        \"type\": \"${congestion_type}\", 
                                        \"up_mbps\": ${congestion_up_mbps}, 
                                        \"down_mbps\": ${congestion_down_mbps}
                                    }
                                }"
    ;;
*)
    stream_network_settings=""
esac

if [ "${stream_network_settings}" != "" ]; then
    stream_network_settings="${stream_network_settings},"
fi


stream_security=$(uci_get_by_name ${cfgid} vmess_stream_security)

tls_settings=""
if [ "${stream_security}" == "tls" ]; then
    server_name=$(uci_get_by_name ${cfgid} vmess_stream_tls_server_name)
    alpn=$(uci_get_by_name ${cfgid} vmess_stream_tls_alpn)
    allow_insecure=$(uci_get_by_name ${cfgid} vmess_stream_tls_allow_insecure)
    allow_insecure_str=""
    if [ "${allow_insecure}" == "1" ]; then
        # 开启
        allow_insecure_str=true
    else
        # 关闭
        allow_insecure_str=false
    fi
    
    disable_system_root=$(uci_get_by_name ${cfgid} vmess_stream_tls_disable_system_root)
    disable_system_root_str=""
    if [ "${disable_system_root}" == "1" ]; then
        # 开启
        disable_system_root_str=true
    else
        # 关闭
        disable_system_root_str=false
    fi
    
    
    certificates=$(uci_get_by_name ${cfgid} vmess_stream_tls_certificates)
    verify_client_certificate=$(uci_get_by_name ${cfgid} vmess_stream_tls_verify_client_certificate)
    verify_client_certificate_str=""
    if [ "${verify_client_certificate}" == "1" ]; then
        # 开启
        verify_client_certificate_str=true
    else
        # 关闭
        verify_client_certificate_str=false
    fi    
    
    pinned_peer_certificate_chain_sha256=$(uci_get_by_name ${cfgid} vmess_stream_tls_pinned_peer_certificate_chain_sha256)
    
    
    tls_settings="${tls_settings},  
                \"tlsSettings\": 
                    {
                    \"serverName\": \"${server_name}\", 
                    \"alpn\": ${alpn}, 
                    \"allowInsecure\": ${allow_insecure_str}, 
                    \"disableSystemRoot\": ${disable_system_root_str},
                    \"certificates\": ${certificates},
                    \"verifyClientCertificate\": ${verify_client_certificate_str},
                    \"pinnedPeerCertificateChainSha256\": \"${pinned_peer_certificate_chain_sha256}\"
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
            "protocol": "vmess",
            "settings": {
                "vnext": [
                    {
                        "address": "${server}",
                        "port": ${server_port},
                        "users": [
                            {
                                "id": "${id}",
                                "alterId": ${alter_id},
                                "security": "${security}"
                            }
                        ]
                    }
                ]
            },
            "streamSettings": {
                "network": "${stream_network}",
                ${stream_network_settings}
                "security": "${stream_security}"${tls_settings}
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