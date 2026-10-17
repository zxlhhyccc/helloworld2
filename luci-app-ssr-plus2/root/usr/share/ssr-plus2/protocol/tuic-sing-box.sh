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
# 用户名
username=$(uci_get_by_name ${cfgid} username)
# 密码
password=$(uci_get_by_name ${cfgid} password)


congestion_control=$(uci_get_by_name ${cfgid} tuic_congestion_control)
if [ "${congestion_control}" == "newreno" ]; then
    congestion_control="new_reno"
fi

if [ "${congestion_control}" == "bbr3" ]; then
    congestion_control="bbr"
fi


udp_relay_mode=$(uci_get_by_name ${cfgid} tuic_udp_relay_mode)

zero_rtt_handshake=$(uci_get_by_name ${cfgid} tuic_zero_rtt_handshake)
if [ "${zero_rtt_handshake}" == "1" ]; then
    zero_rtt_handshake=true
else
    zero_rtt_handshake=false
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
            "type": "tuic",
            "server": "${server}",
            "server_port": ${server_port},
            "uuid": "${username}",
            "password": "${password}",
            "congestion_control": "${congestion_control}",
            "udp_relay_mode": "${udp_relay_mode}",
            "zero_rtt_handshake": ${zero_rtt_handshake},
            "tls": {
                "enabled": true
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