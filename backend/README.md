# Bankend

## Deploy steps [Ubuntu 22.04]

* Prerequisites

1. Node v18.15.0+
2. Mysql server
3. git

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

* Run server

```bash
$ npm start
```