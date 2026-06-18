include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-ssr-plus2
PKG_VERSION:=1.0.0
PKG_RELEASE:=1


# PKG_CONFIG_DEPENDS:= \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS_RUST \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_NONE_Client \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Libev_Client \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Rust_Client \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_ShadowsocksR_Libev_Client \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_NONE_V2RAY \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_V2ray \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Xray \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Trojan \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_NaiveProxy \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Tuic_Client \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadow_TLS \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria2 \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Simple_Obfs \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_V2ray_Plugin \
#     CONFIG_PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Xray_Plugin
    



LUCI_TITLE:=Socks5/SS/SSR/Vmess/Trojan/NaiveProxy/Vless/Hysteria/Tuic/ShadowTLS LuCI interface
LUCI_PKGARCH:=all
LUCI_DEPENDS:= \
    +coreutils +coreutils-base64 +curl \
    +PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks:ipt2socks \
    +PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS:dns2socks \
    +PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS_RUST:dns2socks-rust \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Libev_Client:shadowsocks-libev-ss-local \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Libev_Client:shadowsocks-libev-ss-redir \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Rust_Client:shadowsocks-rust-sslocal \
    +PACKAGE_$(PKG_NAME)_INCLUDE_ShadowsocksR_Libev_Client:shadowsocksr-libev-ssr-local \
    +PACKAGE_$(PKG_NAME)_INCLUDE_ShadowsocksR_Libev_Client:shadowsocksr-libev-ssr-redir \
    +PACKAGE_$(PKG_NAME)_INCLUDE_V2ray:v2ray-core \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Xray:xray-core \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Trojan:trojan \
    +PACKAGE_$(PKG_NAME)_INCLUDE_NaiveProxy:naiveproxy \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria:hysteria \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Tuic_Client:tuic-client \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadow_TLS:shadow-tls \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria2:hysteria2 \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Simple_Obfs:simple-obfs-client \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_V2ray_Plugin:v2ray-plugin \
    +PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Xray_Plugin:xray-plugin



define Package/$(PKG_NAME)/config
select PACKAGE_luci-lua-runtime if PACKAGE_$(PKG_NAME)


choice
    prompt "DNS2socks Selection"
    default PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS

    config PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS
    bool "DNS2socks"

    config PACKAGE_$(PKG_NAME)_INCLUDE_DNS2SOCKS_RUST
    bool "DNS2socks-Rust"
endchoice


choice
    prompt "Shadowsocks Client Selection"
    default PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Rust_Client if aarch64 || x86_64
    default PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Libev_Client

    config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_NONE_Client
    bool "None"

    config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Libev_Client
    bool "Shadowsocks-libev"
    select PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks

    config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Rust_Client
    bool "Shadowsocks-rust"
    depends on aarch64||arm||i386||mips||mipsel||x86_64
    depends on !(TARGET_x86_geode||TARGET_x86_legacy)
endchoice


config PACKAGE_$(PKG_NAME)_INCLUDE_ShadowsocksR_Libev_Client
    bool "Include ShadowsocksR Libev Client"
    select PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks
    default n


choice
    prompt "Vmess/Vless Selection"
    default PACKAGE_$(PKG_NAME)_INCLUDE_Xray if aarch64||arm||i386||x86_64
    default PACKAGE_$(PKG_NAME)_INCLUDE_NONE_V2RAY

    config PACKAGE_$(PKG_NAME)_INCLUDE_NONE_V2RAY
    bool "None"

    config PACKAGE_$(PKG_NAME)_INCLUDE_V2ray
    bool "V2ray-core"

    config PACKAGE_$(PKG_NAME)_INCLUDE_Xray
    bool "Xray-core"
endchoice


config PACKAGE_$(PKG_NAME)_INCLUDE_Trojan
    bool "Include Trojan"
    select PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_NaiveProxy
    bool "Include NaiveProxy"
    select PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks
    depends on !(arc||armeb||mips||mips64||powerpc||TARGET_gemini)
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria
    bool "Include Hysteria"
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Tuic_Client
    bool "Include Tuic-Client"
    select PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks
    depends on aarch64||arm||i386||x86_64
    depends on !(TARGET_x86_geode||TARGET_x86_legacy)
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Shadow_TLS
    bool "Include Shadow-TLS"
    depends on aarch64||arm||x86_64
    depends on !(TARGET_x86_geode||TARGET_x86_legacy)
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Hysteria2
    bool "Include Hysteria2"
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Simple_Obfs
    bool "Include Shadowsocks Simple Obfs Plugin"
    default n

config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_V2ray_Plugin
    bool "Include Shadowsocks V2ray Plugin"
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_Shadowsocks_Xray_Plugin
    bool "Include Shadowsocks Xray Plugin"
    default n


config PACKAGE_$(PKG_NAME)_INCLUDE_IPT2Socks
	bool "Include IPT2Socks"
	default n

endef


define Package/$(PKG_NAME)/conffiles
/etc/config/ssr-plus2
/etc/ssr-plus2/
endef


include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature