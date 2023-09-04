# Frontend

## Get started (run locally)

* Prerequisites

1. Node 18.15.0+
2. npm 9.5.0+
3. git

```bash
$ cd ~/vswork
$ git clone git@github.com:huoyijie/infinity.git
```

* Install deps

```bash
$ cd infinity/frontend
$ npm i
```

* Add .env file

```bash
$ cat <<EOF > .env
NEXT_PUBLIC_SOCKETIO_URL=ws://your_bankend_server_domain_or_ip:your_bankend_server_port
EOF
```

Don't forget to change `your_bankend_server_domain_or_ip` (localhost) and `your_bankend_server_port` (5000).

If you run the bankend server behind reverse server (such as Nginx) and use tls, change `ws` to `wss`. 

* Run server

```bash
$ npm run dev
```

## Deploy with Github Actions (Github pages)

See `.github/workflows/nextjs.yml`

## All Environment variables

* NEXT_PUBLIC_SOCKETIO_URL=ws://localhost:5000

If your backend server is deployed behind nginx with tls enabled, you shoud forward the websocket upgrade request from nginx to backend server, and you shoud config `NEXT_PUBLIC_SOCKETIO_URL=wss://your_domain`.

* NEXT_PUBLIC_BASE_PATH=/

If your backend server configed with `BASH_PATH=/infinity`, then you shoud config `NEXT_PUBLIC_BASE_PATH=/infinity` too.
