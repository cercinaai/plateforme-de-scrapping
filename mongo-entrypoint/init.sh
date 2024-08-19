#!/usr/bin/env bash
echo "Creating mongo users..."
mongosh --authenticationDatabase admin --host localhost -u ${MONGO_INITDB_ROOT_USERNAME} -p ${MONGO_INITDB_ROOT_PASSWORD} ${MONGO_DATABASE}  --eval "db.getSiblingDB('${MONGO_DATABASE}').createUser({user: '${MONGO_USER}', pwd: '${MONGO_PASSWORD}', roles: [{role: 'readWrite', db: '${MONGO_DATABASE}'}]})"
echo "Done"