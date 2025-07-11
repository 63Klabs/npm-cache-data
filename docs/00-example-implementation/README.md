# Implementation Examples

> Note: To implement Cache Data, a DynamoDb and S3 bucket needs to be created to store the cache. See the [Cache-Data DynamoDb and S3 CloudFormation Resource Templates](#cache-data-dynamodb-and-s3-cloudformation-resource-templates) section below.

A full implementation example and tutorial is available through the [Atlantis Tutorials repository](https://github.com/63klabs/atlantis-tutorials) as [Tutorial #2](https://github.com/63Klabs/atlantis-tutorials/blob/main/tutorials/02-s3-dynamo-api-gateway-lambda-cache-data-node/README.md). (Atlantis is a collection of templates and deployment scripts to assist in starting and automating serverless deployments using AWS SAM and CloudFormation.)

## CloudFormation Template Examples

### Cache-Data DynamoDb and S3 CloudFormation Resource Example Templates

Use the [S3 and DynamoDb example template](./example-template-s3-and-dynamodb-cache-store.yml) for creating your DynamoDb and S3 cache storage locations.

You can create a centrally-shared DynamoDb table and S3 location for use among all your instances (each instance has its own encryption key to prevent cache-sharing/exposure).

You can also add the `CacheDataDynamoDbTable` and `CacheDataS3Bucket` to each application template individually. However, this will quickly increase the number of S3 buckets and DynamoDb tables to keep track of.

### Lambda Function Resource Template Example

Use the [Lambda Example Template](./example-template-lambda-function.yml) for properties, environment variables, and execution permissions to use in your Lambda function.

The Cache Data packages utilizes environment variables for cache, logging, and other configuration settings.

Conditionals or parameters can be utilized to provide deployment context switching instead of hard-coding values.

In order to utilize X-Ray tracing, Lambda Insights, and to write and read data from the DynamoDb and S3 data stores, IAM permissions must be provided in a Lambda execution role.

### Cache-Data Parameter Examples

If you want to pass cache-data settings as CloudFormation template parameters during deployments, see [Cache-Data Template Parameter Examples](./example-template-parameters.yml).

Even if not using the parameters, the parameter example also provides descriptions, examples, and value requirements to further understand how to use the settings.

## CodeBuild Script Examples

Cache-Data requires a secret key to encrypt cached data in S3 and DynamoDb. 

This key is stored in SSM Parameter store and can be generated using [the generate-put-ssm.py build script](./generate-put-ssm.py)

The script can be used to store additional parameters at build time. Review comments in the script for usage information.

The script will also look for a [template-configuration.json](./template-configuration.json) file in the script or parent directory and apply supplied tags to the parameter. If placeholders are used in tag values (for example `$VARIBLE_NAME$`) it is replaced with the corresponding environment variable.

Template configuration files are often used alongside buildspec.yml files for supplying `Parameters` and `Tags` to SAM deployments.

To implement the generate-put-ssm.py script during your CodeBuild process, you can refer to the [example buildspec.yml](./example-buildspec.yml).

## Code Examples

### Configuration

[Configuration Example Code](./example-config.js)

### Lambda Handler

[Lambda Handler Example Code](./example-handler.js)
