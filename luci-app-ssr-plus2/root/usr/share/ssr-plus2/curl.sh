#!/bin/sh

# 该脚本解决 直接调用 curl 可能 返回数据不全就结束问题
# 使用方法
# 方法1  sh curl.sh 访问的地址
# 方法2  sh curl.sh curl的参数(参数将透传给curl命令 不要使用 -o 参数)

# 参数数量
count=$#
if [ "${count}" == "0" ]; then
    # 
    # echo "参数错误"
    exit 0
fi

# 输出参数
# echo "$1"
# 获取 base64 编码
base64String=`echo -n "$1" | md5sum | awk '{print $1}'`
#echo "${base64String}"

# 完整路径
savePath="/tmp/${base64String}"

# 下载文件
if [ "${count}" == "1" ]; then
    # 只有 1 个参数
    `curl -sSL --connect-timeout 60 --max-time 180 --retry 3 --insecure --location "$1" -o ${savePath} >/dev/null 2>&1`
else
    # 多个参数
    `curl $@ -o ${savePath} >/dev/null 2>&1`
fi


# 命令执行结果
status="$?"

#echo "${status}"
if [ "${status}" == "0" ]; then
    # 下载成功
    #echo "成功"
    cat ${savePath}
    
#else
#    # 下载失败
#    echo ""
fi

# 删除缓存文件
`rm -rf ${savePath}`