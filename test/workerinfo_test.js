suite('provisioners and worker-types', () => {
  var debug       = require('debug')('test:claim-work');
  var assert      = require('assert');
  var _           = require('lodash');
  var Promise     = require('promise');
  var taskcluster = require('taskcluster-client');
  var assume      = require('assume');
  var helper      = require('./helper');
  var testing     = require('taskcluster-lib-testing');

  setup(async function() {
    const Provisioner = await helper.load('Provisioner', helper.loadOptions);
    const WorkerType = await helper.load('WorkerType', helper.loadOptions);

    await Provisioner.scan({}, {handler: p => p.remove()});
    await WorkerType.scan({}, {handler: p => p.remove()});
  });

  test('queue.listProvisioners returns an empty list', async () => {
    const result = await helper.queue.listProvisioners();
    assert(result.provisioners.length === 0, 'Did not expect any provisioners');
  });

  test('queue.listProvisioners returns provisioners', async () => {
    const Provisioner = await helper.load('Provisioner', helper.loadOptions);

    await Provisioner.create({provisionerId: 'prov1', expires: new Date('3017-07-29')});

    const result = await helper.queue.listProvisioners();
    assert(result.provisioners.length === 1, 'expected provisioners');
    assert(result.provisioners[0].provisionerId === 'prov1', 'expected prov1');
  });

  test('provisioner seen creates and updates a provisioner', async () => {
    const workerInfo = await helper.load('workerInfo', helper.loadOptions);

    await Promise.all([
      workerInfo.seen('prov2'),
      workerInfo.seen('prov2'),
    ]);
    await workerInfo.seen('prov2');

    const result = await helper.queue.listProvisioners();
    assert(result.provisioners.length === 1, 'expected a provisioner');
  });

  test('provisioner expiration works', async () => {
    const Provisioner = await helper.load('Provisioner', helper.loadOptions);

    await Provisioner.create({provisionerId: 'prov1', expires: new Date('1017-07-29')});
    await helper.expireWorkerInfo();

    const result = await helper.queue.listProvisioners();
    assert(result.provisioners.length === 0, 'expected no provisioners');
  });

  test('queue.listWorkerTypes returns an empty list', async () => {
    const WorkerType = await helper.load('WorkerType', helper.loadOptions);
    const result = await helper.queue.listWorkerTypes('no-provisioner');

    assert(result.workerTypes.length === 0, 'did not expect any worker-types');
  });

  test('queue.listWorkerTypes returns workerTypes', async () => {
    const WorkerType = await helper.load('WorkerType', helper.loadOptions);
    const workerType = 'gecko-b-2-linux';

    await WorkerType.create({provisionerId: 'prov-A', workerType, expires: new Date('3017-07-29')});

    const result = await helper.queue.listWorkerTypes('prov-A');

    assert(result.workerTypes.length === 1, 'expected workerTypes');
    assert(result.workerTypes[0].workerType === workerType, `expected ${workerType}`);
  });

  test('list worker-types (limit and continuationToken)', async () => {
    const WorkerType = await helper.load('WorkerType', helper.loadOptions);
    const expires = new Date('3017-07-29');

    await WorkerType.create({provisionerId: 'prov1', workerType: 'gecko-b-2-linux', expires});
    await WorkerType.create({provisionerId: 'prov1', workerType: 'gecko-b-2-android', expires});

    let result = await helper.queue.listWorkerTypes('prov1', {limit: 1});

    assert(result.continuationToken);
    assert(result.workerTypes.length === 1);

    result = await helper.queue.listWorkerTypes('prov1', {
      limit: 1,
      continuationToken: result.continuationToken,
    });

    assert(!result.continuationToken);
    assert(result.workerTypes.length === 1);
  });

  test('worker-type seen creates and updates a worker-type', async () => {
    const workerInfo = await helper.load('workerInfo', helper.loadOptions);
    const workerType = 'gecko-b-2-linux';

    await Promise.all([
      workerInfo.seen('prov2', workerType),
      workerInfo.seen('prov2', workerType),
    ]);

    const result = await helper.queue.listWorkerTypes('prov2');
    assert(result.workerTypes.length === 1, 'expected a worker-type');
  });

  test('worker-type expiration works', async () => {
    const WorkerType = await helper.load('WorkerType', helper.loadOptions);

    await WorkerType.create({provisionerId: 'prov1', workerType: 'gecko-b-2-linux', expires: new Date('1017-07-29')});
    await helper.expireWorkerInfo();

    const result = await helper.queue.listWorkerTypes('prov1');
    assert(result.workerTypes.length === 0, 'expected no worker-types');
  });
});