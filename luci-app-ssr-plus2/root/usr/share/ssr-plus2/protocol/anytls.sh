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
idle_session_check_interval=$(uci_get_by_name ${cfgid} anytls_idle_session_check_interval 30s)


# 空闲会话超时时间
idle_session_timeout=$(uci_get_by_name ${cfgid} anytls_idle_session_timeout 30s)


# 最小空闲会话数
min_idle_session=$(uci_get_by_name ${cfgid} anytls_min_idle_session 5)


# Server Name
server_name=$(uci_get_by_name ${cfgid} anytls_server_name)
if [ "${server_name}" != "" ]; then
    server_name=",
                \"server_name\": \"${server_name}\""
fi


insecure=""
# Allow Insecure
allow_insecure=$(uci_get_by_name ${cfgid} anytls_allow_insecure)
if [ "${allow_insecure}" == "1" ]; then
    # 开启
    insecure=",
                \"insecure\": true"
fi


# 
client_metadata=$(uci_get_by_name ${cfgid} anytls_client_metadata)
if [ "${client_metadata}" != "" ]; then
    # 有值
    
    # 先 获取
    version=`sing-box version --name | awk -F '.' '{print $1,$2}'`

    if [ "${version}" != "" ]; then
        # 不为 空
        
        # 版本号判断
        # 主版本号
        major_version=-1
        # 次版本号
        minor_version=-1
        
        # 索引
        ruleIndex=0

        for line in ${version}; do
            # 索引 + 1
            ruleIndex=$((ruleIndex+1))
            if [ "1" == "${ruleIndex}" ]; then
                # 主版本号
                major_version=$((line))
            fi
            
            if [ "2" == "${ruleIndex}" ]; then
                # 次 版本号
                minor_version=$((line))
            fi
        done
        
        
        # 输出
        # echo "主版本号:${major_version}"
        # echo "次版本号:${minor_version}"

        if [[ ${major_version} -eq -1 || ${minor_version} -eq -1 ]]; then
            # 未 获取到版本号
            client_metadata=""
        elif [ ${major_version} -lt 1 ]; then
            # 主版本号 < 1
            client_metadata=""
        elif [[ ${major_version} -eq 1 && ${minor_version} -lt 14 ]]; then
            # 主版本号 = 1 且 次版本号 < 14
            client_metadata=""
        else
            # 支持 client_metadata 参数
            client_metadata=",
            \"client_metadata\": \"${client_metadata}\""
        fi
    fi
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
            "type": "anytls",
            "server": "${server}",
            "server_port": ${server_port},
            "password": "${password}",
            "idle_session_check_interval": "${idle_session_check_interval}",
            "idle_session_timeout": "${idle_session_timeout}",
            "min_idle_session": ${min_idle_session},
            "tls": {
                "enabled": true${server_name}${insecure}
            }${client_metadata}
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
