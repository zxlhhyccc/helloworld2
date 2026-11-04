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


# 空闲会话检查间隔
idle_session_check_interval=$(uci_get_by_name ${cfgid} anytls_idle_session_check_interval 30)


# 空闲会话超时时间
idle_session_timeout=$(uci_get_by_name ${cfgid} anytls_idle_session_timeout 30)


# 最小空闲会话数
min_idle_session=$(uci_get_by_name ${cfgid} anytls_min_idle_session 5)


# Server Name
server_name=$(uci_get_by_name ${cfgid} anytls_server_name)
if [ "${server_name}" != "" ]; then
    server_name=",
                    \"server_name\": \"${server_name}\""
fi


# Allow Insecure
allow_insecure=$(uci_get_by_name ${cfgid} anytls_allow_insecure)
if [ "${allow_insecure}" == "1" ]; then
    # 开启
    allow_insecure=",
                    \"allowInsecure\": true"
fi


# 
client_metadata=$(uci_get_by_name ${cfgid} anytls_client_metadata)
if [ "${client_metadata}" != "" ]; then
    # 有值
	client_metadata=",
                    \"client_metadata\": \"${client_metadata}\""
fi


tls_settings="${server_name}${allow_insecure}"

if [ "${tls_settings}" != "" ]; then

    # 去除 第一个字符
	if [ "${tls_settings}" != "" ]; then
		tls_settings="${tls_settings:1}
                "
	fi

    tls_settings=",
                \"tlsSettings\": {${tls_settings}}"
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
            "protocol": "anytls",
            "settings": {
                "address": "${server}",
                "port": ${server_port},
                "password": "${password}",
                "idleSessionCheckInterval": ${idle_session_check_interval},
                "idleSessionTimeout": ${idle_session_timeout},
                "minIdleSession": ${min_idle_session}
            },
            "streamSettings": {
                "network": "raw",
                "security": "tls"${tls_settings}
            }
        }
    ]
}
EOF

# 启动程序
xray run -c ${TEMP_PATH}/proxy-${ruleIndex}.json > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &

# 进程号
pid=$!

# 休眠 让程序启动
sleep 2

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
