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
# 密码
password=$(uci_get_by_name ${cfgid} password)
# 加密方式
encrypt_method=$(uci_get_by_name ${cfgid} ssr_encrypt_method)

# 协议
protocol=$(uci_get_by_name ${cfgid} ssr_protocol)
# 协议参数
protocol_param=$(uci_get_by_name ${cfgid} ssr_protocol_param)


# 插件名称
obfs=$(uci_get_by_name ${cfgid} ssr_obfs)
# 插件参数
obfs_param=$(uci_get_by_name ${cfgid} ssr_obfs_param)

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

# 输出端口



# 输出配置文件
# socks5 配置
cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}-socks5.json"
{
    "local_address": "0.0.0.0",
    "local_port": ${socks5Port},
    "server": "${server}",
    "server_port": ${server_port},
    "password": "${password}",
    "method": "${encrypt_method}",
    "protocol": "${protocol}",
    "protocol_param": "${protocol_param}",
    "obfs": "${obfs}",
    "obfs_param": "${obfs_param}",
    "fast_open": ${fast_open_str}
}
EOF

# # redir 配置
# cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}-redir.json"
# {
#     "local_address": "0.0.0.0",
#     "local_port": ${redirectPort},
#     "server": "${server}",
#     "server_port": ${server_port},
#     "password": "${password}",
#     "method": "${encrypt_method}",
#     "protocol": "${protocol}",
#     "protocol_param": "${protocol_param}",
#     "obfs": "${obfs}",
#     "obfs_param": "${obfs_param}",
#     "fast_open": ${fast_open_str}
# }
# EOF


# 启动程序
# socks5
ssr-local -c ${TEMP_PATH}/proxy-${ruleIndex}-socks5.json > ${TEMP_PATH}/proxy-${ruleIndex}-socks5.out 2>&1 &

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
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
fi


# redirect
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
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
fi


# tproxy
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
else
    # 启动成功
    # 保存 进程ID
    echo "${pid}" >> ${TEMP_PATH}/pid
    
    # 返回 端口
    echo "${socks5Port},${redirectPort},${tproxyPort}"
fi



# # 透明代理
# ssr-redir -c ${TEMP_PATH}/proxy-${ruleIndex}-redir.json > ${TEMP_PATH}/proxy-${ruleIndex}-redir.out 2>&1 &
# 
# 
# # 进程号
# pid=$!
# 
# # 休眠 1秒
# sleep 1
# 
# # echo $pid
# # 判断是否启动成功
# count=`ps -ef | awk '{print $1}' | grep "${pid}" | wc -l`
# 
# #echo $count
# 
# if [ "${count}" == "0" ]; then
#     # 启动失败
#     # 要 关闭之前启动的程序
#     kill ${tempPid}
#     # 返回空字符串
#     echo ""
# else
#     # 启动成功
#     # 保存 进程ID
#     echo "${pid}" >> ${TEMP_PATH}/pid
#     
#     # 返回 端口
#     echo "${socks5Port},${redirectPort}"
# fi