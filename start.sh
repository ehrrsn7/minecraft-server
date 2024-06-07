#!/bin/bash

# TODO: use ferium profiles to manage mods instead of manual if/elif checks

   # -n
   #    string is not null.
   # -z
   #    string is null, that is, has zero length

sudo java -Xmx4G -jar fabric-server-launch.jar nogui;
exit 0;

PORT_NUMBER=25565;
LATEST=logs/surpress-port/latest.log;

OPEN_PROCESS=$(sudo lsof -ti:25565);
LOG_PATH=logs/surpress-port/$(date +"%Y-%m-%d.%H:%M:%S").log;

sudo kill -9 $OPEN_PROCESS 2> $LOG_PATH;
sudo rm $LATEST;
ln $LOG_PATH $LATEST;

# run server
if [ $# -eq 0 ]; then
   # no arguments supplied, run vanilla server
   sudo java -jar -Xmx4G server.jar nogui;

elif [ $1 == "-f" ]; then
   # -f, run fabric server

   FAPI_IN_MODS=$(compgen -G "mods/fabric-api*");
   FAPI_IN_DIS=$(compgen -G "mods/.disabled/fabric-api*");
   FAPI_IN_OLD=$(compgen -G "mods/.old/fabric-api*");

   QFAPI_IN_MODS=$(compgen -G "mods/qfapi*");

   # move qfapi to mods/ if not already
   if [[ -n $FAPI_IN_MODS ]]; then
      echo "Fabric API is installed, okay to run quilt server";

   elif [[ -z $FAPI_IN_MODS ]] && [[ -z $FAPI_IN_DIS ]] && [[ -z $FAPI_IN_OLD ]]; then
      echo "Error: Fabric API is not installed."
      echo "Please load it into mods/ before running so the server doesn't crash."
      exit 1;

   else
      echo "loading Fabric API from cache":;

      if [[ -z $FAPI_IN_MODS ]] && [[ -n $FAPI_IN_DIS ]]; then
         echo "loading Fabric API from $FAPI_IN_DIS";
         mv $FAPI_IN_DIS mods/;

      elif [[ -z $FAPI_IN_MODS ]] && [[ -n $FAPI_IN_OLD ]]; then
         echo "loading Fabric API from mods/.old/";
         mv $FAPI_IN_OLD mods/;
      fi
   fi

   # move fabric api to mods/.disabled/ if not already
   if [[ -z $QFAPI_IN_MODS ]]; then
      echo "QFAPI is not installed, okay to run fabric server";

   else
      echo "moving QFAPI to cache:";
      mv $QFAPI_IN_MODS mods/.disabled/;
   fi

   sudo java -Xmx4G -jar fabric-server-launch.jar nogui -Djava.net.preferIPv6Addresses=true;

elif [ $1 == "-q" ]; then
   # -q, run quilt server

   QFAPI_IN_MODS=$(compgen -G "mods/qfapi*");
   QFAPI_IN_DIS=$(compgen -G "mods/.disabled/qfapi*");
   QFAPI_IN_OLD=$(compgen -G "mods/.old/qfapi*");

   FAPI_IN_MODS=$(compgen -G "mods/fabric-api*");

   # move qfapi to mods/ if not already
   if [[ -n $QFAPI_IN_MODS ]]; then
      echo "QFAPI is installed, okay to run quilt server";

   elif [[ -z $QFAPI_IN_MODS ]] && [[ -z $QFAPI_IN_DIS ]] && [[ -z $QFAPI_IN_OLD ]]; then
      echo "Error: QFAPI is not installed."
      echo "Please load it into mods/ before running so the server doesn't crash."
      exit 1;

   else
      echo "loading QFAPI from cache":;

      if [[ -z $QFAPI_IN_MODS ]] && [[ -n $QFAPI_IN_DIS ]]; then
         echo "loading QFAPI from $QFAPI_IN_DIS";
         mv $QFAPI_IN_DIS mods/;

      elif [[ -z $QFAPI_IN_MODS ]] && [[ -n $QFAPI_IN_OLD ]]; then
         echo "loading QFAPI from mods/.old/";
         mv $QFAPI_IN_OLD mods/;
      fi
   fi

   # move fabric api to mods/.disabled/ if not already
   if [[ -z $FAPI_IN_MODS ]]; then
      echo "Fabric API is not installed, okay to run quilt server";

   else
      echo "moving Fabric API to cache:";
      mv $FAPI_IN_MODS mods/.disabled/;
   fi

   echo "success, running server:"

   # move qfapi if needed
   # cache fabric api if needed (quilt api contains fabric api ("q-f" api))
   # run server
   sudo java -jar -Xmx4G quilt-server-launch.jar nogui;

else
   echo "Invalid argument. Usage:";
   echo "   'start.sh'    : run vanilla minecraft server";
   echo "   'start.sh -f' : run fabric server";
   echo "   'start.sh -q' : run quilt server";
   exit 1;
fi
