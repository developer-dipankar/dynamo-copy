var AWS = require('aws-sdk');

Object.defineProperty(Array.prototype, 'chunk_inefficient', {
  value: function (chunkSize) {
    var array = this;
    return [].concat.apply([],
      array.map(function (elem, i) {
        return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
      })
    );
  }
});

const sanitizeDoc = obj => {
  Object.entries(obj).forEach(([key, val]) => {
    if (val && typeof val === 'object') {
      sanitizeDoc(val);
    } else if (val === '') {
      delete obj[key];
    }
  });
  return obj;
};

const readFromTable = async ({
  params,
  awsConfig,
  items = [],
  async
}) => {
  try {
    AWS.config.update(awsConfig);
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    let data;
    if (!params.IndexName && !params.KeyConditionExpression) {
      data = await dynamoDb.scan({
        ...params
      }).promise();
    } else {
      data = await dynamoDb.query({
        ...params
      }).promise();
    }
    if (data.Items) items = [...items, ...data.Items];
    if (data.LastEvaluatedKey) {
      console.log(data.LastEvaluatedKey, data.Items.length);
      params.ExclusiveStartKey = data.LastEvaluatedKey;
      if (async) {
        return {
          params,
          items,
          awsConfig
        };
      } else {
        return await readFromTable({
          params,
          items,
          awsConfig
        });
      }
    }
    return {items};
  } catch (error) {
    throw Error(error);
  }

};

const writeToTable = async ({
  awsConfig,
  items,
  TableName
}) => {
  try {
    AWS.config.update(awsConfig);
    const dynamoDb = new AWS.DynamoDB.DocumentClient();
    const chunkItems = items.chunk_inefficient(25);
    let count = 0;
    for (const chunkItem of chunkItems) {
      const data = await dynamoDb.batchWrite({
        ReturnConsumedCapacity: 'TOTAL',
        RequestItems: {
          [TableName]: chunkItem.map(item => ({
            PutRequest: {
              Item: sanitizeDoc(item) || item
            }
          }))
        }
      }).promise();
      count = count + 25;
      console.log('Total Updated:', count);
    }
  } catch (error) {
    throw Error(error);
  }
}

const syncTable = async ({
  sourceAWSConfig,
  destAWSConfig,
  queryParams,
  destTableName,
  fn,
  async
}) => {
  let i = 0, count = 0;
  while (i >= 0) {
    let {params, items} = await readFromTable({
      awsConfig: sourceAWSConfig,
      params: queryParams,
      async
    });
    if (fn && typeof fn === 'function') {
      items = await fn(items);
    }
    if (destAWSConfig && destTableName && items.length > 0) {
      await writeToTable({
        awsConfig: destAWSConfig,
        items,
        TableName: destTableName
      });
    }
    count = count + items.length;
    console.log('LastEvaluatedKey', params.ExclusiveStartKey, i, count);
    if (params && params.ExclusiveStartKey) {
      i++;
    } else {
      i = -1;
    }
  }
}

module.exports = {
  syncTable
};