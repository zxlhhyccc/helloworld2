#!/usr/bin/lua

local json = require "luci.jsonc"
local sys  = require "luci.sys"


-- 设备MAC
local device_mac = arg[1]

if device_mac == nil or string.len(device_mac) == 0 then
    -- 退出
    os.exit(0)
end


-- 获取信息
local host_hints = sys.exec('ubus call luci-rpc getHostHints')


-- json 解析
local parse = json.new()
-- 处理
done, err = parse:parse(host_hints)

local host_hints_json = parse:get()

-- 循环
for k, v in pairs(host_hints_json) do
    if (device_mac == k) then
        -- ipv4
        local ipaddrs = v.ipaddrs
        -- ipv6
        local ip6addrs = v.ip6addrs

        -- 输出ip
        print(table.concat(ipaddrs, ' ') .. ' ' .. table.concat(ip6addrs, ' '))
        -- 退出
        os.exit(0)
    end
end