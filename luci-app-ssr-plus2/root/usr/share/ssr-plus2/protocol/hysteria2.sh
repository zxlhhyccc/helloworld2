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
if [ "${port_range}" != "" ]; then
    server_port="${server_port},${port_range}"
fi

# 密码
password=$(uci_get_by_name ${cfgid} password)


# 上行速度
up=$(uci_get_by_name ${cfgid} hysteria2_up)
if [[ "${up}" =~ "^[0-9]+$" ]]; then
    # 数字
    up="${up} mbps"
fi

# 下行速度
down=$(uci_get_by_name ${cfgid} hysteria2_down)
if [[ "${down}" =~ "^[0-9]+$" ]]; then
    # 数字
    down="${down} mbps"
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
    allow_insecure_str=""
    if [ "${allow_insecure}" == "1" ]; then
        allow_insecure_str=true
    else
        allow_insecure_str=false
    fi


    tls_settings="

tls:
  sni: ${tls_sni}
  insecure: ${allow_insecure_str}"
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
    

    transport_settings="

transport:
  type: ${transport_type}
  ${transport_type}:
    hopInterval: ${transport_hopInterval}"
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
    


    obfs_settings="

obfs:
  type: ${obfs_type}
  ${obfs_type}:
    password: ${obfs_password}"
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
# 获取 tproxy 端口
tproxyPort=$(get_port $((redirectPort+1)))

# 输出端口



# 输出配置文件
cat <<-EOF > "${TEMP_PATH}/proxy-${ruleIndex}.yaml"
server: ${server}:${server_port} 

auth: ${password}

bandwidth:
  up: ${up}
  down: ${down}

socks5:
  listen: 0.0.0.0:${socks5Port}

tcpTProxy:
  listen: :${tproxyPort}

udpTProxy:
  listen: :${tproxyPort}

tcpRedirect:
  listen: :${redirectPort}${tls_settings}${transport_settings}${obfs_settings}
EOF


# 启动程序
hysteria2 -l debug --disable-update-check -c ${TEMP_PATH}/proxy-${ruleIndex}.yaml > ${TEMP_PATH}/proxy-${ruleIndex}.out 2>&1 &


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