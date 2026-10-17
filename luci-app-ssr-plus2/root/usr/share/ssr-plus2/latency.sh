#!/bin/sh

# 参数数量
count=$#
if [ "${count}" == "0" ]; then
    # 
    # echo "参数错误"
    exit 0
fi

# 输出参数
# echo "$1"

# 取出 cfgid
cfgid=$1

# 包名
export PACKAGE_NAME="ssr-plus2"
# 日志文件
export LOG_FILE=/var/log/ssr-plus2.log


# 动态生成配置文件路径
export TEMP_PATH=/tmp/ssr-plus2/latency/${cfgid}
# pid文件
PID_FILE=${TEMP_PATH}/pid

# 新建目录
mkdir -p ${TEMP_PATH}


# 启动临时代理
resultPort=`sh /usr/share/ssr-plus2/proxy.sh 0 ${cfgid}`

if [ "${resultPort}" == "" ]; then
    # 启动失败
    # 删除目录
    rm -rf ${TEMP_PATH}
    exit 0
fi

# socks5 端口
socks5Port=`echo -n "${resultPort}" | awk -F ',' '{print $1}'`

# 执行测试
time_total=`curl -x socks5h://127.0.0.1:${socks5Port} --connect-timeout 5 --max-time 5 --retry 2 -o /dev/null -s -w '%{time_total}' https://www.google.com/`
# 命令执行结果
status="$?"


# 关闭临时代理
if [ -f "${PID_FILE}" ]; then
    # 关闭 进程
    for line in $(cat ${PID_FILE}); do kill ${line} 2>/dev/null; done

    # 休息 1秒
    sleep 1
fi
# 删除目录
rm -rf ${TEMP_PATH}


# 输出 时间 单位:秒
# echo "${time_total}"

# 输出 响应时间
# echo "${status}"
if [ "${status}" == "0" ]; then
    # 执行成功
    echo "${time_total}"
else
    # 执行失败
    echo ""
fi