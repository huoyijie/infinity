# Frontend

## Run locally

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

## Deploy steps [Github pages]