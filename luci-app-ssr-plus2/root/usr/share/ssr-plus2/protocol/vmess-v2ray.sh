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
alter_id=$(uci_get_by_name ${cfgid} vmess_alter_id 0)
security=$(uci_get_by_name ${cfgid} vmess_security)


stream_network=$(uci_get_by_name ${cfgid} vmess_stream_network)

stream_network_settings=""

case "${stream_network}" in
tcp)
    header="";

    type=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_type)
    if [ "${type}" != "http" ]; then
        # 非 http
        header="{
                        \"type\": \"none\"
                    }"
    else
        # http
        # request
        request_version=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_version)
        if [ "${request_version}" != "" ]; then
            request_version=",
                            \"version\": \"${request_version}\""
        fi

        request_method=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_method)
        if [ "${request_method}" != "" ]; then
            request_method=",
                            \"method\": \"${request_method}\""
        fi

        request_path=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_path)
        request_headers=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_request_headers "{}")
        
        request="{
                            \"path\": \"${request_path}\",
                            \"headers\": ${request_headers}${request_version}${request_method}
                        }"
        
        
        # response
        response_version=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_version)
        if [ "${response_version}" != "" ]; then
            response_version=",
                            \"version\": \"${response_version}\""
        fi

        response_status=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_status)
        if [ "${response_status}" != "" ]; then
            response_status=",
                            \"status\": \"${response_status}\""
        fi

        response_reason=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_reason)
        if [ "${response_reason}" != "" ]; then
            response_reason=",
                            \"reason\": \"${response_reason}\""
        fi

        response_headers=$(uci_get_by_name ${cfgid} vmess_stream_network_tcp_response_headers "{}")

        response="{
                            \"headers\": ${response_headers}${response_version}${response_status}${response_reason}
                        }"

        header="{
                        \"type\": \"http\",
                        \"request\": ${request},
                        \"response\": ${response}
                    }"
    fi

    stream_network_settings="\"tcpSettings\": {
                    \"header\": ${header}
                }"
    ;;
mkcp)
    mtu=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_mtu)
    if [ "${mtu}" != "" ]; then
        mtu="
                    \"mtu\": ${mtu},"
    fi    
    
    tti=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_tti)
    if [ "${tti}" != "" ]; then
        tti="
                    \"tti\": ${tti},"
    fi

    uplink_capacity=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_uplink_capacity)
    if [ "${uplink_capacity}" != "" ]; then
        uplink_capacity="
                    \"uplinkCapacity\": ${uplink_capacity},"
    fi

    downlink_capacity=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_downlink_capacity)
    if [ "${downlink_capacity}" != "" ]; then
        downlink_capacity="
                    \"downlinkCapacity\": ${downlink_capacity},"
    fi


    congestion=$(uci_get_by_name ${cfgid} vmess_stream_network_kcp_congestion)
    if [ "${congestion}" == "1" ]; then
        # 开启
        congestion=true
    else
        # 关闭
        congestion=false
    fi

    
    read_buffer_size=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_read_buffer_size)
    if [ "${read_buffer_size}" != "" ]; then
        read_buffer_size="
                    \"readBufferSize\": ${read_buffer_size},"
    fi

    write_buffer_size=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_write_buffer_size)
    if [ "${write_buffer_size}" != "" ]; then
        write_buffer_size="
                    \"writeBufferSize\": ${write_buffer_size},"
    fi

    header_type=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_header_type)
    if [ "${header_type}" != "" ]; then
        header_type="
                        \"type\": \"${header_type}\"
                    "
    fi

    seed=$(uci_get_by_name ${cfgid} vmess_stream_network_mkcp_seed)
    if [ "${seed}" != "" ]; then
        seed=",
                    \"seed\": \"${seed}\""
    fi

    stream_network_settings="\"kcpSettings\": {${mtu}${tti}${uplink_capacity}${downlink_capacity}
                    \"congestion\": ${congestion},${read_buffer_size}${write_buffer_size}
                    \"header\": {${header_type}}${seed}
                }"
    ;;
ws)
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_path)
    if [ "${path}" != "" ]; then
        path="
                    \"path\": \"${path}\","
    fi
    
    headers=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_headers)
    if [ "${headers}" != "" ]; then
        headers="
                    \"headers\": ${headers},"
    fi
    
    
    max_early_data=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_max_early_data)
    if [ "${max_early_data}" != "" ]; then
        max_early_data="
                    \"maxEarlyData\": ${max_early_data},"
    fi
    
    
    use_browser_forwarding=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_use_browser_forwarding)
    if [ "${use_browser_forwarding}" == "1" ]; then
        # 开启
        use_browser_forwarding=true
    else
        # 关闭
        use_browser_forwarding=false
    fi
    
    early_data_header_name=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_early_data_header_name)
    if [ "${early_data_header_name}" != "" ]; then
        early_data_header_name="
                    \"earlyDataHeaderName\": \"${early_data_header_name}\","
    fi


    parse_x_forwarded_for=$(uci_get_by_name ${cfgid} vmess_stream_network_ws_parse_x_forwarded_for)
    if [ "${parse_x_forwarded_for}" == "1" ]; then
        # 开启
        parse_x_forwarded_for=true
    else
        # 关闭
        parse_x_forwarded_for=false
    fi


    stream_network_settings="\"wsSettings\": {${path}${headers}${max_early_data}
                    \"useBrowserForwarding\": ${use_browser_forwarding},${early_data_header_name}
                    \"parseXForwardedFor\": ${parse_x_forwarded_for}
                }"
    ;;
h2)
    host=$(uci_get_by_name ${cfgid} vmess_stream_network_h2_host)
    if [ "${host}" != "" ]; then
        host=",
                    \"host\": \"${host}\""
    fi
    
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_h2_path)
    if [ "${path}" != "" ]; then
        path=",
                    \"path\": \"${path}\""
    fi

    method=$(uci_get_by_name ${cfgid} vmess_stream_network_h2_method)
    if [ "${method}" != "" ]; then
        method=",
                    \"method\": \"${method}\""
    fi


    headers=$(uci_get_by_name ${cfgid} vmess_stream_network_h2_headers '{}')


    parse_x_forwarded_for=$(uci_get_by_name ${cfgid} vmess_stream_network_h2_parse_x_forwarded_for)
    if [ "${parse_x_forwarded_for}" == "1" ]; then
        # 开启
        parse_x_forwarded_for=",
                    \"parseXForwardedFor\": true"
    else
        # 关闭
        parse_x_forwarded_for=",
                    \"parseXForwardedFor\": false"
    fi


    stream_network_settings="\"httpSettings\": {
                    \"headers\": ${headers}${host}${path}${method}${parse_x_forwarded_for}
                }"
    ;;
domainsocket)
    path=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_path)
    if [ "${path}" != "" ]; then
        path="
                    \"path\": \"${path}\","
    fi

    abstract=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_abstract)
    if [ "${abstract}" == "1" ]; then
        # 开启
        abstract=true
    else
        # 关闭
        abstract=false
    fi

    padding=$(uci_get_by_name ${cfgid} vmess_stream_network_domainsocket_padding)
    if [ "${padding}" == "1" ]; then
        # 开启
        padding=true
    else
        # 关闭
        padding=false
    fi


    stream_network_settings="\"dsSettings\": {${path}
                    \"abstract\": ${abstract},
                    \"padding\": ${padding}
                }"
    ;;
quic)
    security=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_security)
    key=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_key)
    if [ "${key}" != "" ]; then
        key=",
                    \"key\": \"${key}\""
    fi
    
    
    type=$(uci_get_by_name ${cfgid} vmess_stream_network_quic_header_type)

    stream_network_settings="\"quicSettings\": {
                    \"security\": \"${security}\"${key},
                    \"header\": {
                        \"type\": \"${type}\"
                    }
                }"
    ;;
grpc)
    service_name=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_service_name)
    if [ "${service_name}" != "" ]; then
        service_name=",
                    \"serviceName\": \"${service_name}\""
    fi

    idle_timeout=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_idle_timeout)
    if [ "${idle_timeout}" != "" ]; then
        idle_timeout=",
                    \"idle_timeout\": ${idle_timeout}"
    fi

    health_check_timeout=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_health_check_timeout)
    if [ "${health_check_timeout}" != "" ]; then
        health_check_timeout=",
                    \"health_check_timeout\": ${health_check_timeout}"
    fi


    permit_without_stream=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_permit_without_stream)
    if [ "${permit_without_stream}" == "1" ]; then
        # 开启
        permit_without_stream=true
    else
        # 关闭
        permit_without_stream=false
    fi
    
    initial_windows_size=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_initial_windows_size)
    if [ "${initial_windows_size}" != "" ]; then
        initial_windows_size=",
                    \"initial_windows_size\": ${initial_windows_size}"
    fi


    parse_x_forwarded_for=$(uci_get_by_name ${cfgid} vmess_stream_network_grpc_parse_x_forwarded_for)
    if [ "${parse_x_forwarded_for}" == "1" ]; then
        # 开启
        parse_x_forwarded_for=true
    else
        # 关闭
        parse_x_forwarded_for=false
    fi

    stream_network_settings="\"grpcSettings\": {
                    \"permit_without_stream\": ${permit_without_stream},
                    \"parseXForwardedFor\": ${parse_x_forwarded_for}${service_name}${idle_timeout}${health_check_timeout} ${initial_windows_size}
                }"
    ;;
hy2)
    password=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_password)
    if [ "${password}" != "" ]; then
        password="
                    \"password\": \"${password}\","
    fi

    use_udp_extension=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_use_udp_extension)
    if [ "${use_udp_extension}" == "1" ]; then
        # 开启
        use_udp_extension=true
    else
        # 关闭
        use_udp_extension=false
    fi

    ignore_client_bandwidth=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_ignore_client_bandwidth)
    if [ "${ignore_client_bandwidth}" == "1" ]; then
        # 开启
        ignore_client_bandwidth=true
    else
        # 关闭
        ignore_client_bandwidth=false
    fi


    congestion_type=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_congestion_type)
    if [ "${congestion_type}" != "" ]; then
        congestion_type="
                        \"type\": \"${congestion_type}\","
    fi

    congestion_up_mbps=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_congestion_up_mbps)
    if [ "${congestion_up_mbps}" != "" ]; then
        congestion_up_mbps="
                        \"up_mbps\": ${congestion_up_mbps},"
    fi

    congestion_down_mbps=$(uci_get_by_name ${cfgid} vmess_stream_network_hy2_congestion_down_mbps)
    if [ "${congestion_down_mbps}" != "" ]; then
        congestion_down_mbps="
                        \"down_mbps\": ${congestion_down_mbps},"
    fi
    
    temp_str="${congestion_type}${congestion_up_mbps}${congestion_down_mbps}"
    
    # 去除 最后一个字符
    if [ "${temp_str}" != "" ]; then
        temp_str="${temp_str%?}
                    "
    fi

    stream_network_settings="\"hy2Settings\": {${password}
                    \"use_udp_extension\": ${use_udp_extension},
                    \"ignore_client_bandwidth\": ${ignore_client_bandwidth},
                    \"congestion\": {${temp_str}}
                }"
    ;;
*)
    stream_network_settings=""
esac

if [ "${stream_network_settings}" != "" ]; then
    stream_network_settings="
                ${stream_network_settings},"
fi


stream_security=$(uci_get_by_name ${cfgid} vmess_stream_security)

tls_settings=""
if [ "${stream_security}" == "tls" ]; then
    server_name=$(uci_get_by_name ${cfgid} vmess_stream_tls_server_name)
    if [ "${server_name}" != "" ]; then
        server_name=",
                    \"serverName\": \"${server_name}\""
    fi

    alpn=$(uci_get_by_name ${cfgid} vmess_stream_tls_alpn)
    if [ "${alpn}" != "" ]; then
        alpn=",
                    \"alpn\": ${alpn}"
    fi

    allow_insecure=$(uci_get_by_name ${cfgid} vmess_stream_tls_allow_insecure)
    if [ "${allow_insecure}" == "1" ]; then
        # 开启
        allow_insecure=true
    else
        # 关闭
        allow_insecure=false
    fi
    
    # disable_system_root=$(uci_get_by_name ${cfgid} vmess_stream_tls_disable_system_root)
    # if [ "${disable_system_root}" == "1" ]; then
    #     # 开启
    #     disable_system_root=true
    # else
    #     # 关闭
    #     disable_system_root=false
    # fi
    
    
    # certificates=$(uci_get_by_name ${cfgid} vmess_stream_tls_certificates)
    # 
    # verify_client_certificate=$(uci_get_by_name ${cfgid} vmess_stream_tls_verify_client_certificate)
    # if [ "${verify_client_certificate}" == "1" ]; then
    #     # 开启
    #     verify_client_certificate=true
    # else
    #     # 关闭
    #     verify_client_certificate=false
    # fi    
    
    # pinned_peer_certificate_chain_sha256=$(uci_get_by_name ${cfgid} vmess_stream_tls_pinned_peer_certificate_chain_sha256)
    # 
    # enable_session_resumption=$(uci_get_by_name ${cfgid} vmess_stream_tls_enable_session_resumption)
    # if [ "${enable_session_resumption}" == "1" ]; then
    #     # 开启
    #     enable_session_resumption=true
    # else
    #     # 关闭
    #     enable_session_resumption=false
    # fi

    # ech_config=$(uci_get_by_name ${cfgid} vmess_stream_tls_ech_config)
    # ech_doh_server=$(uci_get_by_name ${cfgid} vmess_stream_tls_ech_doh_server)
 
    
    tls_settings=",
                \"tlsSettings\": {
                    \"allowInsecure\": ${allow_insecure}${server_name}${alpn}
                }"
fi



# 获取 socks5 端口
socks5Port=$(get_port)
# 获取 redirect 端口
redirectPort=$(get_port $((socks5Port+1)))
# 获取 tproxy 端口
tproxyPort=$(get_port $((redirectPort+1)))



# 输出配置文件
cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}.json"
{
    "log": {
        "loglevel": "info"
    },
    "inbounds": [
        {
            "protocol": "socks",
            "listen": "0.0.0.0",
            "port": ${socks5Port},
            "settings": {
                "udp": true
            }
        },
        {
            "protocol": "dokodemo-door",
            "listen": "0.0.0.0",
            "port": ${redirectPort},
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
            "protocol": "dokodemo-door",
            "listen": "0.0.0.0",
            "port": ${tproxyPort},
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
                "network": "${stream_network}",${stream_network_settings}
                "security": "${stream_security}"${tls_settings}
            }
        }
    ]
}
EOF

# 启动程序
v2ray run -c ${TEMP_PATH}/proxy-${ruleIndex}.json > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &

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
    echo "${socks5Port},${redirectPort},${tproxyPort}"
fi