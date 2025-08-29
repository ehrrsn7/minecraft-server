#!/bin/bash
FLAGS="-Djava.net.preferIPv6Addresses=true -Djava.net.preferIPv4Stack=false"
java -Xmx8G -jar fabric-server-launch.jar nogui;
