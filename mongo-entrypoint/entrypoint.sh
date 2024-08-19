#!/usr/bin/env bash
echo "Creating mongo users..."
docker exec mongodb-container mongo --eval "
        db = db.getSiblingDB('$MONGO_DATABASE');
          db.createUser({
            user: '$MONGO_USER',
            pwd: '$MONGO_PASSWORD',
            roles: [{ role: 'readWrite', db: '$MONGO_DATABASE' }]
        });"
echo "Mongo users created."