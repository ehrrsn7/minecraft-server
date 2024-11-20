@REM ensure JAVA_HOME points to a Java SE v22+ installation (I.E. "C:\Program Files\Java\jdk-22\bin\java.exe")

@REM Running Server...
echo %JAVA_HOME%\bin\java.exe
%JAVA_HOME%\bin\java.exe --version
%JAVA_HOME%\bin\java.exe -Xmx4G -jar server.jar nogui > output/output.log 2> output/error.log;