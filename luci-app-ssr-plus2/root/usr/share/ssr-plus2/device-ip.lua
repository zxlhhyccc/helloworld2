#!/usr/bin/lua

local json = require "luci.jsonc"
local sys  = require "luci.sys"


-- 获取信息
local hosts = sys.exec('ubus call luci-rpc getHostHints')

-- 设备名称
local device_name = arg[1]

if device_name == nil or string.len(device_name) == 0 then
    print("")
    -- 退出
    os.exit(0)
end

-- print("hosts")
-- print(hosts)
-- print(device_name)

-- json 解析
local parse = json.new()
-- 处理
done, err = parse:parse(hosts)

-- print("done")
-- print(done)
-- print("err")
-- print(err)

local jsonTable = parse:get()
-- print("json")
-- print(jsonTable)

-- print(json.stringify(jsonTable))

-- 循环
for k, v in pairs(jsonTable) do
    if (device_name == v.name) then
        -- 与要查找的相同
        -- print(k)
        -- print(v)

        -- ipv4
        local ipaddrs = v.ipaddrs
        -- ipv6
        local ip6addrs = v.ip6addrs
        
        -- print(json.stringify(ipaddrs))
        -- print(json.stringify(ip6addrs))
        
        -- 输出ip
        print(table.concat(ipaddrs, ' ') .. ' ' .. table.concat(ip6addrs, ' '))
        -- 退出
        os.exit(0)
    end
end