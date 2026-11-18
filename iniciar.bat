@echo off
cd /d %~dp0

echo Instalando dependencias si faltan...
if not exist push-server\node_modules (
  pushd push-server
  call npm install
  popd
)
if not exist spiderman-pwa\node_modules (
  pushd spiderman-pwa
  call npm install
  popd
)

echo Compilando la aplicacion...
pushd spiderman-pwa
call npm run build
popd

start "" http://localhost:4000

echo Iniciando servidor push (y aplicacion) en http://localhost:4000
pushd push-server
call npm start
