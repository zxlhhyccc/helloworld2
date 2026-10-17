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
if [ "${congestion_control}" != "" ]; then
    congestion_control="
congestion_control = \"${congestion_control}\""
fi

udp_relay_mode=$(uci_get_by_name ${cfgid} tuic_udp_relay_mode)
if [ "${udp_relay_mode}" != "" ]; then
    udp_relay_mode="
udp_relay_mode = \"${udp_relay_mode}\""
fi

zero_rtt_handshake=$(uci_get_by_name ${cfgid} tuic_zero_rtt_handshake)
if [ "${zero_rtt_handshake}" == "1" ]; then
    zero_rtt_handshake=true
else
    zero_rtt_handshake=false
fi

alpn=$(uci_get_by_name ${cfgid} tuic_alpn)
if [ "${alpn}" != "" ]; then
    alpn="
alpn = \"${alpn}\""
fi

sni=$(uci_get_by_name ${cfgid} tuic_sni)

allow_insecure=$(uci_get_by_name ${cfgid} tuic_allow_insecure)
if [ "${allow_insecure}" == "1" ]; then
    allow_insecure="
disable_sni = true
sni = \"${sni}\""
fi

# 获取 socks5 端口
socks5Port=$(get_port)
# # 获取 redirect 端口
# redirectPort=$(get_port $((socks5Port+1)))
# # 获取 tprox 端口
# tproxyPort=$(get_port $((redirectPort+1)))



# 输出配置文件
cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}.toml"
log_level = "info"

[relay]
server = "${server}:${server_port}"
uuid = "${username}"
password = "${password}"${congestion_control}${udp_relay_mode}
zero_rtt_handshake = ${zero_rtt_handshake}${alpn}${allow_insecure}

[local]
server = "0.0.0.0:${socks5Port}"

EOF

# 启动程序
# socks5
tuic-client -c ${TEMP_PATH}/proxy-${ruleIndex}.toml > ${TEMP_PATH}/proxy-${ruleIndex}-socks5.out 2>&1 &

# 进程号
pid=$!

tempPid=${pid}

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
    # 退出
    exit
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
fi


# redirect
# 获取 redirect 端口
redirectPort=$(get_port $((socks5Port+1)))


ipt2socks -s 127.0.0.1 -p ${socks5Port} -l ${redirectPort} -T -R -v > ${TEMP_PATH}/proxy-${ruleIndex}-redirect.out 2>&1 &


# 进程号
pid=$!

tempPid="${tempPid} ${pid}"

# 休眠 1秒
sleep 1

# echo $pid
# 判断是否启动成功
count=`ps -ef | awk '{print $1}' | grep "${pid}" | wc -l`

#echo $count

if [ "${count}" == "0" ]; then
    # 启动失败
    # 要 关闭之前启动的程序
    for temp in ${tempPid}; do kill ${temp} 2>/dev/null; done
    
    # 返回空字符串
    echo ""
    # 退出
    exit
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
fi


# tproxy
# 获取 tprox 端口
tproxyPort=$(get_port $((redirectPort+1)))


ipt2socks -s 127.0.0.1 -p ${socks5Port} -l ${tproxyPort} -U -R -v > ${TEMP_PATH}/proxy-${ruleIndex}-tproxy.out 2>&1 &


# 进程号
pid=$!

tempPid="${tempPid} ${pid}"

# 休眠 1秒
sleep 1

# echo $pid
# 判断是否启动成功
count=`ps -ef | awk '{print $1}' | grep "${pid}" | wc -l`

#echo $count

if [ "${count}" == "0" ]; then
    # 启动失败
    # 要 关闭之前启动的程序
    for temp in ${tempPid}; do kill ${temp} 2>/dev/null; done
    # 返回空字符串
    echo ""
    # 退出
    exit
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
    
    # 返回 端口
    echo "${socks5Port},${redirectPort},${tproxyPort}"
fi
