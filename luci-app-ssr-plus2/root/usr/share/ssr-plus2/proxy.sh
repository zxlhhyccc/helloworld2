#!/bin/sh

# 引入公共方法
. /usr/share/ssr-plus2/utils.sh

# 取出索引
ruleIndex=$1

# 取出 cfgid
cfgid=$2


# 输出
# echo "cfgid:${cfgid}"


# 协议
protocol=$(uci_get_by_name ${cfgid} protocol)

# 输出
# echo "protocol:${protocol}"

# resultPort 
# 返回格式 端口1,端口2,端口3
# 端口1  socks 协议
# 端口2  redir 模式
# 端口3  tproxy 模式(不是所有都返回,部分和端口2相同)
# 返回 空字符串表示 启动失败

# 调用具体协议脚本
case "${protocol}" in
socks5)
    # socks5 协议
    if [ `command -v v2ray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-v2ray.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v xray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-xray.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动sockes5协议工具"
        resultPort=""
    fi
    ;;
ss)
    # ss 协议
    if [ `command -v ss-local | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-libev.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v sslocal | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-sslocal.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v v2ray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-v2ray.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v xray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-xray.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动ss协议工具"
        resultPort=""
    fi
    ;;
ssr)
    # ssr 协议
    if [ `command -v ssr-local | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-libev.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动ss协议工具"
        resultPort=""
    fi
    ;;
vmess)
    # vmess 协议
    if [ `command -v v2ray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-v2ray.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v xray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-xray.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动vmess协议工具"
        resultPort=""
    fi
    ;;
trojan)
    # trojan 协议
    if [ `command -v trojan | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动trojan协议工具"
        resultPort=""
    fi
    ;;
naiveproxy)
    # naiveproxy 协议
    if [ `command -v v2ray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动naiveproxy协议工具"
        resultPort=""
    fi
    ;;
vless)
    # vless 协议
    if [ `command -v v2ray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-v2ray.sh ${ruleIndex} ${cfgid}`
    elif [ `command -v xray | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}-xray.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动vless协议工具"
        resultPort=""
    fi
    ;;
hysteria)
    # hysteria 协议
    if [ `command -v hysteria | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动hysteria协议工具"
        resultPort=""
    fi
    ;;
tuic)
    # tuic 协议
    if [ `command -v tuic | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动tuic协议工具"
        resultPort=""
    fi
    ;;
shadowtls)
    # shadowtls 协议
    echolog "无启动shadowtls协议工具"
    resultPort=""
    ;;
hysteria2)
    # hysteria2 协议
    if [ `command -v hysteria2 | wc -l` == 1 ]; then
        resultPort=`sh /usr/share/ssr-plus2/protocol/${protocol}.sh ${ruleIndex} ${cfgid}`
    else
        echolog "无启动hysteria2协议工具"
        resultPort=""
    fi
    ;;
*)
    # 默认
    resultPort=""
    ;;
esac

# 返回
echo "${resultPort}"