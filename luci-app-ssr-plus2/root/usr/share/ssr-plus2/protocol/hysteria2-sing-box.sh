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
# 跳跃端口
port_range=$(uci_get_by_name ${cfgid} hysteria2_port_range)
server_ports=""
if [ "${port_range}" != "" ]; then
    # 将 , - 替换成 :
    port_range=`echo "${port_range}" | sed 's/,/:/; s/-/:/'`
    server_ports=",
            \"server_ports\": [\"${port_range}\"]"
fi

# 密码
password=$(uci_get_by_name ${cfgid} password)


# 上行速度
up_mbps=$(uci_get_by_name ${cfgid} hysteria2_up_mbps)
if [[ "${up_mbps}" =~ "^[0-9]+$" ]]; then
    # 数字
    up_mbps=",
            \"up_mbps\": ${up_mbps}"
fi

# 下行速度
down_mbps=$(uci_get_by_name ${cfgid} hysteria2_down_mbps)
if [[ "${down_mbps}" =~ "^[0-9]+$" ]]; then
    # 数字
    down_mbps=",
            \"down_mbps\": ${down_mbps}"
fi

# TLS
tls_settings=""
tls=$(uci_get_by_name ${cfgid} hysteria2_tls)
if [ "${tls}" == "1" ]; then
    # 开启
    # 
    tls_sni=$(uci_get_by_name ${cfgid} hysteria2_tls_sni)

    # 
    allow_insecure=$(uci_get_by_name ${cfgid} hysteria2_allow_insecure)
    if [ "${allow_insecure}" == "1" ]; then
        allow_insecure=true
    else
        allow_insecure=false
    fi


    tls_settings=",
                \"insecure\": ${allow_insecure},
                \"server_name\": \"${tls_sni}\"
            "
fi


# Transport
transport_settings=""
transport=$(uci_get_by_name ${cfgid} hysteria2_transport)
if [ "${transport}" == "1" ]; then
    # 开启
    # 
    transport_type=$(uci_get_by_name ${cfgid} hysteria2_transport_type)
    # 
    transport_hopInterval=$(uci_get_by_name ${cfgid} hysteria2_transport_hopInterval)
    

    transport_settings=",
            \"hop_interval\": \"${transport_hopInterval}ms\""
fi



# obfs
obfs_settings=""
obfs=$(uci_get_by_name ${cfgid} hysteria2_obfs)
if [ "${obfs}" == "1" ]; then
    # 开启
    # 
    obfs_type=$(uci_get_by_name ${cfgid} hysteria2_obfs_type)
    # 
    obfs_password=$(uci_get_by_name ${cfgid} hysteria2_obfs_password)
    


    obfs_settings=",
            \"obfs\": {
                \"type\": \"${obfs_type}\",
                \"password\": \"${obfs_password}\"
            }"
fi



# TCP 快速打开
fast_open=$(uci_get_by_name ${cfgid} fast_open)

fast_open_str=""
if [ "${fast_open}" == "1" ]; then
    # 开启
    fast_open_str=true
else
    # 关闭
    fast_open_str=false
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
            "type": "hysteria2",
            "server": "${server}",
            "server_port": ${server_port},
            "password": "${password}"${server_ports}${up_mbps}${down_mbps}${transport_settings}${obfs_settings},
            "tls": {
                "enabled": true${tls_settings}
            }
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