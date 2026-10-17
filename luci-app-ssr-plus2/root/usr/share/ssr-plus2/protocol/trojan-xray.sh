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

tls_settings=""
# TLS
tls=$(uci_get_by_name ${cfgid} trojan_tls)
if [ "${tls}" == "1" ]; then
    # 开启
    # 
    tls_sni=$(uci_get_by_name ${cfgid} trojan_tls_sni)
    trojan_allow_insecure=$(uci_get_by_name ${cfgid} trojan_allow_insecure)
    
    verify=false
    if [ "${trojan_allow_insecure}" == "1" ]; then
        # 允许 不安全链接
        verify=true
    fi
    tls_settings=",
            \"streamSettings\": {
                \"tlsSettings\": {
                    \"serverName\": \"${tls_sni}\",
                    \"allowInsecure\": ${verify}
                }
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
            "protocol": "trojan",
            "settings": {
                "servers": [
                    {
                        "address": "${server}",
                        "port": ${server_port},
                        "password": "${password}"
                    }
                ]
            }${tls_settings}
        }
    ]
}
EOF

# 启动程序
xray run -c ${TEMP_PATH}/proxy-${ruleIndex}.json > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &

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