#!/bin/sh

# PACKAGE_NAME 需要在 父脚本指定  export PACKAGE_NAME="test"

PORT_FILE=/tmp/ssr-plus2/port
# 端口锁定文件
PORT_LOCK_FILE=/var/lock/ssr-plus2-port.lock


# 日志输出
echolog() {
    local d="$(date "+%Y-%m-%d %H:%M:%S")"
    echo -e "$d: $*" >>${LOG_FILE}
}


uci_get_by_section() { # 参数说明: section index option 默认值
    local ret=$(uci get ${PACKAGE_NAME}.@$1[$2].$3 2>/dev/null)
    echo "${ret:=$4}"
}


uci_get_by_name() { # 参数说明: cfgid option 默认值
    local ret=$(uci get ${PACKAGE_NAME}.$1.$2 2>/dev/null)
    echo ${ret:=$3}
}


# 获取可用端口
get_port() {
    # 获取文件描述符 1001
    exec 1001>"$PORT_LOCK_FILE"
    
    if flock 1001 ; then
        # 获取到 锁

        # 端口
        local port

        # 使用 默认值
        if [ -f "${PORT_FILE}" ]; then
            # 存在 文件
            port=$(cat ${PORT_FILE})
            # +1
            port=$((port+1))
        else
            # 文件 不存在
            # 使用 默认值
            port=1000
        fi

        if [ -n "$1" ]; then
            # 传入值
            local tempPort=$1;
            
            # 取 最大值
            if [ "$port" -gt "$tempPort" ]; then
                port=${port}
            else
                port=${tempPort}
            fi
        fi


        while true
        do
            # 判断是否存在
            local count=`netstat -an | grep -w "${port}" | wc -l`
            # echo "count:${count}"
            
            if [ "${count}" == "0" ]; then
                # 保存 端口到文件
                echo "${port}" > ${PORT_FILE}
                # 返回 端口
                echo "${port}"
                break;
            fi
            
            # +1
            port=$((port+1))
        done
    fi
}