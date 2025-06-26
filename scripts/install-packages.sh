#!/bin/bash

# Make sure this runs as root
if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo $0)"
  exit 1
fi

# ---------- Base System ----------
base_system=(
  base base-devel bash-completion sudo lsb-release pacmanlogviewer
  man-db man-pages logrotate mkinitcpio mkinitcpio-firmware
)

# ---------- Fonts ----------
fonts=(
  adobe-source-han-sans-cn-fonts adobe-source-han-sans-jp-fonts
  adobe-source-han-sans-kr-fonts adobe-source-sans-fonts ttf-bitstream-vera
  ttf-dejavu ttf-droid ttf-hack ttf-inconsolata ttf-ms-fonts ttf-roboto
  ttf-roboto-mono ttf-ubuntu-font-family ttf-meslo-nerd-font-powerlevel10k
  noto-fonts gsfonts xorg-fonts xorg-mkfontscale
)

# ---------- Audio ----------
audio=(
  alsa-firmware alsa-lib alsa-plugins alsa-utils pulseaudio
  pulseaudio-alsa pulseaudio-bluetooth pavucontrol pasystray
)

# ---------- Networking ----------
networking=(
  networkmanager networkmanager-qt5 network-manager-applet
  networkmanager-openconnect networkmanager-openvpn
  networkmanager-pptp networkmanager-vpnc wpa_supplicant iw iwd
  avahi nss-mdns inetutils bind openssh openvpn pptpclient vpnc
  modemmanager usb_modeswitch wvdial ndisc6 dnsmasq tcpdump
  ethtool ppp
)

# ---------- Desktop Environments / WM ----------
desktop_envs=(
  xfce4-session xfce4-settings xfdesktop xfwm4 xfwm4-themes
  xfce4-panel xfce4-terminal qtile edu-qtile-git edu-xfce-git
)

# ---------- XFCE Add-ons ----------
xfce_plugins=(
  xfce4-appfinder xfce4-artwork xfce4-battery-plugin
  xfce4-clipman-plugin xfce4-cpufreq-plugin xfce4-cpugraph-plugin
  xfce4-dict xfce4-diskperf-plugin xfce4-eyes-plugin
  xfce4-fsguard-plugin xfce4-genmon-plugin xfce4-mailwatch-plugin
  xfce4-mount-plugin xfce4-mpc-plugin xfce4-netload-plugin
  xfce4-notes-plugin xfce4-notifyd xfce4-places-plugin
  xfce4-power-manager xfce4-pulseaudio-plugin xfce4-screensaver
  xfce4-screenshooter xfce4-sensors-plugin xfce4-smartbookmark-plugin
  xfce4-systemload-plugin xfce4-taskmanager xfce4-time-out-plugin
  xfce4-timer-plugin xfce4-verve-plugin xfce4-wavelan-plugin
  xfce4-weather-plugin xfce4-whiskermenu-plugin xfce4-xkb-plugin
)

# ---------- Window Manager Helpers & Customization ----------
wm_customization=(
  sxhkd picom-git rofi edu-rofi-git edu-rofi-themes-git
  edu-variety-config-git flameshot-git fastfetch-git neofetch-git
  starship qt5ct lxappearance-gtk3 kvantum-qt5
)

# ---------- Themes & Icons ----------
themes_icons=(
  arc-gtk-theme bibata-cursor-theme breeze-icons sardi-icons
  surfn-icons-git neo-candy-icons-git
)

# ---------- File Managers ----------
file_managers=(
  thunar thunar-archive-plugin thunar-volman thunar-media-tags-plugin
  nemo nemo-fileroller nemo-share catfish
)

# ---------- System Tools ----------
system_tools=(
  htop btop screen tmux rsync gpart parted gptfdisk gparted
  testdisk ddrescue fsarchiver partclone partimage clonezilla
  xarchiver unace unzip unrar dosfstools ntfs-3g mtools e2fsprogs
  xfsprogs jfsutils nilfs-utils f2fs-tools nbd udftools
  udisks2 udiskie system-config-printer cups cups-filters cups-pdf
  simple-scan sane ghostscript gutenprint
)

# ---------- Firmware & Drivers ----------
firmware_drivers=(
  intel-ucode sof-firmware aic94xx-firmware wd719x-firmware
  upd72020x-fw linux-firmware linux-firmware-intel
  linux-firmware-nvidia linux-firmware-amdgpu
  linux-firmware-broadcom linux-firmware-realtek
  linux-firmware-atheros linux-firmware-marvell
  linux-firmware-mediatek linux-firmware-liquidio
  linux-firmware-qcom linux-firmware-qlogic linux-firmware-whence
)

# ---------- Multimedia ----------
multimedia=(
  vlc parole evince ristretto flameshot-git simplescreenrecorder-qt6-git
  spotify spotify-adblock-git ffmpegthumbnailer galculator file-roller
  xed mousepad mintstick nomacs variety
)

# ---------- Browsers ----------
browsers=(
  firefox firefox-ublock-origin chromium brave-bin
)

# ---------- Development & CLI Tools ----------
dev_cli=(
  git micro vim meld python-pylint downgrade lolcat bat duf eza
  ripgrep the_silver_searcher yay-git paru-git
)

# ---------- Boot & Kernel ----------
boot_kernel=(
  grub efibootmgr refind os-prober linux linux-headers
)

# ---------- Virtualization / Cloud ----------
virtualization=(
  openconnect open-iscsi hyperv
)

# ---------- Miscellaneous ----------
misc=(
  yad akm exo garcon mugshot menulibre
  edu-shells-git edu-arc-dawn-git edu-arc-kde
  edu-sddm-simplicity-git archlinux-logout-git
  archlinux-tweak-tool-git arch-rebuild-order arch-repro-status
  arch-signoff devtools ananicy-cpp cachyos-ananicy-rules-git
  hardcode-fixer-git hardinfo2 hw-probe
  power-profiles-daemon preload preload rate-mirrors reflector
  systemd-resolvconf intel-media-driver vulkan-intel vulkan-radeon
  vulkan-nouveau mobile-broadband-provider-info
)

# ---------- Installation Function ----------
install_group() {
  local group_name=$1[@]
  local group=("${!group_name}")
  echo -e "\n==> Installing ${1//_/ }..."
  pacman -S --needed --noconfirm "${group[@]}" || echo "Failed installing some packages in $1"
}

# ---------- Main ----------
pacman -Syu --noconfirm

install_group base_system
install_group fonts
install_group audio
install_group networking
install_group desktop_envs
install_group xfce_plugins
install_group wm_customization
install_group themes_icons
install_group file_managers
install_group system_tools
install_group firmware_drivers
install_group multimedia
install_group browsers
install_group dev_cli
install_group boot_kernel
install_group virtualization
install_group misc

echo -e "\n==> All done!"
