@REM ensure JAVA_HOME points to a Java SE v22+ installation (I.E. "C:\Program Files\Java\jdk-22\bin\java.exe")

@REM Opening Gateway to port 25565 using ngrok
@REM ngrok tcp 25565

@REM Running Server...
%JAVA_HOME% -Xmx4G -jar server.jar nogui;