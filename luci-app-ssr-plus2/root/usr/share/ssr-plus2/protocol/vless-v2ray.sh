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
    header="";

    type=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_type)
    if [ "${type}" != "http" ]; then
        # 非 http
        header="{
                        \"type\": \"none\"
                    }"
    else
        # http
        # request
        request_version=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_version)
        if [ "${request_version}" != "" ]; then
            request_version=",
                            \"version\": \"${request_version}\""
        fi

        request_method=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_method)
        if [ "${request_method}" != "" ]; then
            request_method=",
                            \"method\": \"${request_method}\""
        fi

        request_path=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_path)
        request_headers=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_headers "{}")
        
        request="{
                            \"path\": \"${request_path}\",
                            \"headers\": ${request_headers}${request_version}${request_method}
                        }"
        
        
        # response
        response_version=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_version)
        if [ "${response_version}" != "" ]; then
            response_version=",
                            \"version\": \"${response_version}\""
        fi

        response_status=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_status)
        if [ "${response_status}" != "" ]; then
            response_status=",
                            \"status\": \"${response_status}\""
        fi

        response_reason=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_reason)
        if [ "${response_reason}" != "" ]; then
            response_reason=",
                            \"reason\": \"${response_reason}\""
        fi

        response_headers=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_response_headers "{}")

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
xhttp)
    stream_network_settings=""
    ;;
kcp)
    mtu=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_mtu)
    if [ "${mtu}" != "" ]; then
        mtu="
                    \"mtu\": ${mtu},"
    fi
    
    tti=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_tti)
    if [ "${tti}" != "" ]; then
        tti="
                    \"tti\": ${tti},"
    fi

    uplink_capacity=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_uplink_capacity)
    if [ "${uplink_capacity}" != "" ]; then
        uplink_capacity="
                    \"uplinkCapacity\": ${uplink_capacity},"
    fi

    downlink_capacity=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_downlink_capacity)
    if [ "${downlink_capacity}" != "" ]; then
        downlink_capacity="
                    \"downlinkCapacity\": ${downlink_capacity},"
    fi

    cwnd_multiplier=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_cwnd_multiplier)
    if [ "${cwnd_multiplier}" != "" ]; then
        cwnd_multiplier="
                    \"readBufferSize\": ${cwnd_multiplier},"
    fi

    max_sending_window=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_max_sending_window)
    if [ "${max_sending_window}" != "" ]; then
        max_sending_window="
                    \"writeBufferSize\": ${max_sending_window},"
    fi



    header_type=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_header_type)
    if [ "${header_type}" == "wechat" ]; then
            header_type="wechat-video"
    fi
    
    if [ "${header_type}" != "" ]; then
        header_type="
                        \"type\": \"${header_type}\"
                    "
    fi

    seed=$(uci_get_by_name ${cfgid} vless_stream_network_kcp_seed)
    if [ "${seed}" != "" ]; then
        seed=",
                    \"seed\": \"${seed}\""
    fi

    stream_network_settings="\"kcpSettings\": {${mtu}${tti}${uplink_capacity}${downlink_capacity}${cwnd_multiplier}${max_sending_window}
                    \"header\": {${header_type}}${seed}
                }"
    ;;
ws)
    host=$(uci_get_by_name ${cfgid} vless_stream_network_ws_host)

    path=$(uci_get_by_name ${cfgid} vless_stream_network_ws_path)
    if [ "${path}" != "" ]; then
        path=",
                    \"path\": \"${path}\""
    fi
    
    
    headers=$(uci_get_by_name ${cfgid} vless_stream_network_ws_headers)

    if [ "${headers}" == "" ]; then
        if [ "${host}" != "" ]; then
            headers="{
                        \"Host\": \"${host}\"
                    }"
        else
            headers="{}"
        fi
    else
        if [ "${host}" != "" ]; then
            # 去除最后 括号
            headers="${headers%?},\"Host\": \"${host}\"}"
        fi
    fi


    stream_network_settings="\"wsSettings\": {
                    \"headers\": ${headers}${path}
                }"
    ;;
grpc)
    service_name=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_service_name)
    if [ "${service_name}" != "" ]; then
        service_name=",
                    \"serviceName\": \"${service_name}\""
    fi

    idle_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_idle_timeout)
    if [ "${idle_timeout}" != "" ]; then
        idle_timeout=",
                    \"idle_timeout\": ${idle_timeout}"
    fi

    health_check_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_health_check_timeout)
    if [ "${health_check_timeout}" != "" ]; then
        health_check_timeout=",
                    \"health_check_timeout\": ${health_check_timeout}"
    fi


    permit_without_stream=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_permit_without_stream)
    if [ "${permit_without_stream}" == "1" ]; then
        # 开启
        permit_without_stream=true
    else
        # 关闭
        permit_without_stream=false
    fi
    
    initial_windows_size=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_initial_windows_size)
    if [ "${initial_windows_size}" != "" ]; then
        initial_windows_size=",
                    \"initial_windows_size\": ${initial_windows_size}"
    fi


    stream_network_settings="\"grpcSettings\": {
                    \"permit_without_stream\": ${permit_without_stream}${service_name}${idle_timeout}${health_check_timeout} ${initial_windows_size}
                }"
    ;;
httpupgrade)
    # v2ray 名称
    stream_network="h2"

    host=$(uci_get_by_name ${cfgid} vless_stream_network_http_host)
    if [ "${host}" != "" ]; then
        host=",
                    \"host\": \"${host}\""
    fi
    
    path=$(uci_get_by_name ${cfgid} vless_stream_network_http_path)
    if [ "${path}" != "" ]; then
        path=",
                    \"path\": \"${path}\""
    fi


    headers=$(uci_get_by_name ${cfgid} vless_stream_network_http_headers '{}')


    stream_network_settings="\"httpSettings\": {
                    \"headers\": ${headers}${host}${path}
                }"
    ;;
hysteria)
    # v2ray 名称
    stream_network="hysteria2"

    password=$(uci_get_by_name ${cfgid} vless_stream_network_hysteria_auth)
    if [ "${password}" != "" ]; then
        password="
                    \"password\": \"${password}\","
    fi


    congestion_type=$(uci_get_by_name ${cfgid} vless_stream_network_hy2_congestion_type)
    if [ "${congestion_type}" != "" ]; then
        congestion_type="
                        \"type\": \"${congestion_type}\","
    fi

    congestion_up_mbps=$(uci_get_by_name ${cfgid} vless_stream_network_hy2_congestion_up_mbps)
    if [ "${congestion_up_mbps}" != "" ]; then
        congestion_up_mbps="
                        \"up_mbps\": ${congestion_up_mbps},"
    fi

    congestion_down_mbps=$(uci_get_by_name ${cfgid} vless_stream_network_hy2_congestion_down_mbps)
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


stream_security=$(uci_get_by_name ${cfgid} vless_stream_security)

tls_settings=""
if [ "${stream_security}" == "tls" ]; then
    server_name=$(uci_get_by_name ${cfgid} vless_stream_tls_server_name)
    if [ "${server_name}" != "" ]; then
        server_name=",
                    \"serverName\": \"${server_name}\""
    fi

    alpn=$(uci_get_by_name ${cfgid} vless_stream_tls_alpn)
    if [ "${alpn}" != "" ]; then
        alpn=",
                    \"alpn\": ${alpn}"
    fi

    allow_insecure=$(uci_get_by_name ${cfgid} vless_stream_tls_allow_insecure)
    if [ "${allow_insecure}" == "1" ]; then
        # 开启
        allow_insecure=true
    else
        # 关闭
        allow_insecure=false
    fi
 
    
    tls_settings=",
                \"tlsSettings\": {
                    \"allowInsecure\": ${allow_insecure}${server_name}${alpn}
                }"
fi

reality_settings=""


# 获取 socks5 端口
socks5Port=$(get_port)
# 获取 redirect 端口
redirectPort=$(get_port $((socks5Port+1)))
# 获取 tprox 端口
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
                "network": "${stream_network}",${stream_network_settings}
                "security": "${stream_security}"${tls_settings}${reality_settings}
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