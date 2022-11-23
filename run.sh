#!/bin/bash
#first move the node folder in .nvm to /usr/local
systemctl stop botd.service
cp botstart.sh /usr/local/bin
cp botstop.sh /usr/local/bin
cp botd.service /etc/systemd/system/botd.service

chmod 744 /usr/local/bin/botstart.sh
chmod 744 /usr/local/bin/botstop.sh
chmod 664 /etc/systemd/system/botd.service


systemctl daemon-reload
systemctl enable botd.service
systemctl start botd.service

#ps aux | grep forever