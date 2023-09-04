# Bankend

## Get started [Ubuntu 22.04]

* Prerequisites

1. Node v18.15.0+
2. npm 9.5.0+
3. Mysql server
4. git

* Clone the repo

```bash
$ cd ~/vswork
$ git clone git@github.com:huoyijie/infinity.git
```

* Install deps

```bash
$ cd infinity/backend
$ npm i
```

* Add .env file

```bash
$ cat <<EOF > .env
PORT=5000
DATABASE_URL="mysql://your_mysql_username:your_mysql_password@localhost:3306/infinity"
EOF
```

Don't forget to change `your_mysql_username` and `your_mysql_password`.

* Create database `infinity`

```bash
$ mysql -u your_mysql_username -p
# Input your_mysql_password
Enter password: 
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 4986
Server version: 8.0.32-0ubuntu0.22.04.2 (Ubuntu)

Copyright (c) 2000, 2023, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

# create database `infinity`
mysql> CREATE DATABASE `infinity` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
Query OK, 1 row affected (0.53 sec)

# exit
mysql> exit
```

* Creating the database schemas

```bash
$ npx prisma db push
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": MySQL database "infinity" at "localhost:3306"

🚀  Your database is now in sync with your Prisma schema. Done in 545ms

✔ Generated Prisma Client (5.1.1 | library) to ./node_modules/@prisma/client in 72ms
```

Query the database:

```bash
mysql> use infinity
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> show tables;
+--------------------+
| Tables_in_infinity |
+--------------------+
| Drawing            |
+--------------------+
1 row in set (0.00 sec)
```

* Run server

```bash
$ npm start
```

## All Environment variables

* HOST (default: localhost)

Backend server listen addr.

* PORT (default: 5000)

Backend server listen port.

* BASE_PATH (default: /)

You shoud deploy backend server behind nginx with tls enabled.

Such as `wss://huoyijie.cn:1024/infinity/socket.io`, bashPath is `/infinity`.

* ALLOW_ORIGIN (default: *)

You should config like this `ALLOW_ORIGIN=https://huoyijie.github.io` for security
