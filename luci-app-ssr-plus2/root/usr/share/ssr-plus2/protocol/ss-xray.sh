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
encrypt_method=$(uci_get_by_name ${cfgid} ss_encrypt_method)

# 启用插件
enable_plugin=$(uci_get_by_name ${cfgid} ss_enable_plugin)

# 插件参数
plugin_str=""
if [ "${enable_plugin}" == "1" ]; then
    # 启用插件
    # 插件名称
    plugin=$(uci_get_by_name ${cfgid} ss_plugin)

    if [ "${plugin}" == "custom" ]; then
        # 自定义插件路径
        plugin=$(uci_get_by_name ${cfgid} ss_custom_plugin)
    fi

    # 插件参数
    plugin_opts=$(uci_get_by_name ${cfgid} ss_plugin_opts)
    
    plugin_str="
    \"plugin\": \"${plugin}\",
    \"plugin_opts\": \"${plugin_opts}\","
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
            "protocol": "shadowsocks",
            "settings": {
                "servers": [
                    {
                        "address": "${server}",
                        "port": ${server_port},
                        "method": "${encrypt_method}",
                        "password": "${password}"
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