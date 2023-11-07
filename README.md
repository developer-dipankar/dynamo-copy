- Copy data from one AWS account to another AWS account in DynamoDB. 
- Copy data in same AWS account in DynamoDB. 
- Upsert data in DynamoDB. 
- Copy data, modify, and insert. 


```bash
const {syncTable} = require('dynamo-copy');

(async () => {
    await syncTable({
        sourceAWSConfig: { // AWS.config.update() params
            region: 'source AWS account region',
            accessKeyId: 'source AWS account access key',
            secretAccessKey: 'source AWS account secret key'
        },
        queryParams: { // dynamoDB queryParams
            TableName: 'source table name',
            KeyConditionExpression: "propertyId = :s",
            ExpressionAttributeValues: {
                ':s': 'test'
            },
            ExclusiveStartKey: null
        },
        destTableName: 'destination table name',
        destAWSConfig: { // AWS.config.update() params
            region: 'destination AWS account region',
            accessKeyId: 'destination AWS account access key',
            secretAccessKey: 'destination AWS account secret key'
        },
        fn: async (items) => { // you can modify the copy data and insert into destination table
            console.log({items});
            ...
            ...
            return items;
        },
        async: false
    })
})();
```
    