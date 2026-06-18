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

# 是否启用密码
auth_enable=$(uci_get_by_name ${cfgid} auth_enable)

# 用户名
username=$(uci_get_by_name ${cfgid} username)
# 密码
password=$(uci_get_by_name ${cfgid} password)


auth_str=""
if [ "${auth_enable}" == "1" ]; then
    # 开启
    auth_str=",
                        \"users\": [
                            {
                                \"user\": \"${username}\",
                                \"pass\": \"${password}\"
                            }
                        ]"
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
            "protocol": "socks",
            "settings": {
                "servers": [
                    {
                        "address": "${server}",
                        "port": ${server_port}${auth_str}
                    }
                ]
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