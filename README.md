# dotstudioPRO AWS S3 Watch Folder

A simple NodeJS server that creates an MRSS feed of video files populated from a folder in S3. Authentication is accomplished through providing an IAM Access Key/Secret combo.

## Running the project

1. In the project root, `npm install`

2. Clone the `sample-aws-config.json` file to `aws-config.json` and replace the values inside with the ones from your IAM user/account. Plase note the `folder` key needs to contain a path all the way down to the folder you want to "watch", or construct the MRSS feed out of. For example a key value of `here/is/the/path/to/your/files` would "watch" the contents of the `files` folder 7 layers deep inside the specified bucket.

3. Clone the `sample-config.json` file to `config.json`. This configuration file lets you pick a port for your server to run on (default is 3000) and set up a connection to Redis. dotstudioPRO polls Watch Folder feeds every 15 minutes - if you have Redis infrastructure available you may add redis credentials to enable caching and lessen the load on your server. If Redis infrastructure is unavailable or not necessary, please remove the sub-object from the config file.

4. `npm run start` to start the server.
