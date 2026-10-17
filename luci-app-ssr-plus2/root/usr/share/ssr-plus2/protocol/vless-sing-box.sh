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
    type=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_type)

    if [ "${type}" == "http" ]; then
        # http
        # request
        request_method=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_method)
        if [ "${request_method}" != "" ]; then
            request_method=",
                \"method\": \"${request_method}\""
        fi

        request_path=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_path)
        if [ "${request_path}" != "" ]; then
            request_path=",
                \"path\": \"${request_path}\""
        fi


        request_headers=$(uci_get_by_name ${cfgid} vless_stream_network_tcp_request_headers "{}")
        

        stream_network_settings="{
                \"type\": \"http\",
                \"headers\": ${request_headers}${request_path}${request_method}
            }"
    else
        stream_network_settings="{}"
    fi
    ;;
xhttp)
    stream_network_settings="{}"
    ;;
kcp)
    stream_network_settings="{}"
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
    
    
    stream_network_settings="{
                \"type\": \"ws\",
                \"headers\": ${headers}${path}
            }"
    ;;
grpc)
    service_name=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_service_name)
    if [ "${service_name}" != "" ]; then
        service_name=",
                \"service_name\": \"${service_name}\""
    fi

    idle_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_idle_timeout)
    if [ "${idle_timeout}" != "" ]; then
        idle_timeout=",
                \"idle_timeout\": \"${idle_timeout}ms\""
    fi

    health_check_timeout=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_health_check_timeout)
    if [ "${health_check_timeout}" != "" ]; then
        health_check_timeout=",
                \"ping_timeout\": \"${health_check_timeout}ms\""
    fi

    permit_without_stream=$(uci_get_by_name ${cfgid} vless_stream_network_grpc_permit_without_stream)
    if [ "${permit_without_stream}" == "1" ]; then
        # 开启
        permit_without_stream=true
    else
        # 关闭
        permit_without_stream=false
    fi
    

    stream_network_settings="{
                \"type\": \"grpc\",
                \"permit_without_stream\": ${permit_without_stream}${service_name}${idle_timeout}${health_check_timeout}
            }"
    ;;
httpupgrade)
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


    stream_network_settings="{
                \"type\": \"httpupgrade\",
                \"headers\": ${headers}${host}${path}
            }"
    ;;
hysteria)
    stream_network_settings="{}"
    ;;
*)
    stream_network_settings="{}"
esac



stream_security=$(uci_get_by_name ${cfgid} vless_stream_security)

tls_settings=""
if [ "${stream_security}" == "tls" ]; then
    server_name=$(uci_get_by_name ${cfgid} vless_stream_tls_server_name)
    if [ "${server_name}" != "" ]; then
        server_name=",
                    \"server_name\": \"${server_name}\""
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


    fingerprint=$(uci_get_by_name ${cfgid} vless_stream_tls_fingerprint)
    if [ "${fingerprint}" != "" ]; then
        fingerprint=",
                    \"utls\": {
                        \"enabled\": true,
                        \"fingerprint\": \"${fingerprint}\"
                    }"
    fi

    tls_settings=",  
                \"tls\": {
                    \"enabled\": true,
                    \"insecure\": ${allow_insecure}${server_name}${alpn}${fingerprint}
                }"
fi

reality_settings=""
if [ "${stream_security}" == "reality" ]; then
    fingerprint=$(uci_get_by_name ${cfgid} vless_stream_reality_fingerprint)
    if [ "${fingerprint}" != "" ]; then
        fingerprint=",
                        \"fingerprint\": \"${fingerprint}\""
    fi


    password=$(uci_get_by_name ${cfgid} vless_stream_reality_password)
    if [ "${password}" != "" ]; then
        password=",
                        \"public_key\": \"${password}\""
    fi


    short_id=$(uci_get_by_name ${cfgid} vless_stream_reality_short_id)
    if [ "${short_id}" != "" ]; then
        short_id=",
                        \"short_id\": \"${short_id}\""
    fi


    tls_settings=",  
                \"tls\": {
                    \"enabled\": true,
                    \"utls\": {
                        \"enabled\": true${fingerprint}
                    },
                    \"reality\": {
                        \"enabled\": true${password}${short_id}
                    }
                }"
fi




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
        "level": "info"
    },
    "inbounds": [
        {
            "type": "socks",
            "listen": "0.0.0.0",
            "listen_port": ${socks5Port}
        },
        {
            "type": "redirect",
            "listen": "0.0.0.0",
            "listen_port": ${redirectPort}
        },
        {
            "type": "tproxy",
            "listen": "0.0.0.0",
            "listen_port": ${tproxyPort}
        }
    ],
    "outbounds": [
        {
            "type": "vless",
            "server": "${server}",
            "server_port": ${server_port},
            "uuid": "${id}",
            "flow": "${flow}",
            "transport": ${stream_network_settings}${tls_settings}
        }
    ]
}
EOF

# 启动程序
sing-box run -c ${TEMP_PATH}/proxy-${ruleIndex}.json > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &

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