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

# 上行速度
up_mbps=$(uci_get_by_name ${cfgid} hysteria_up_mbps)
if [ "${up_mbps}" != "" ]; then
    up_mbps=",
            \"up_mbps\": ${up_mbps}"
fi

# 下行速度
down_mbps=$(uci_get_by_name ${cfgid} hysteria_down_mbps)
if [ "${down_mbps}" != "" ]; then
    down_mbps=",
            \"down_mbps\": ${down_mbps}"
fi

obfs_password=$(uci_get_by_name ${cfgid} hysteria_obfs_password)
if [ "${obfs_password}" != "" ]; then
    obfs_password=",
            \"obfs\": \"${obfs_password}\""
fi

server_name=$(uci_get_by_name ${cfgid} hysteria_server_name)
if [ "${server_name}" != "" ]; then
    server_name=",
    \"server_name\": \"${server_name}\""
fi

allow_insecure=$(uci_get_by_name ${cfgid} hysteria_allow_insecure)
if [ "${allow_insecure}" == "1" ]; then
    allow_insecure=",
    \"insecure\": true"
else
    allow_insecure=",
    \"insecure\": false"
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
            "type": "hysteria",
            "server": "${server}",
            "server_port": ${server_port},
            "auth": "${password}"${up_mbps}${down_mbps}${obfs_password},
            "tls": {
                "enabled": true${server_name}${allow_insecure}
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