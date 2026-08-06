import { rangeHeader } from 'services/maps/s3_handler';

describe('rangeHeader', () => {
  it('is inclusive of the last requested byte', () => {
    expect(rangeHeader(0, 100)).toEqual('bytes=0-99');
    expect(rangeHeader(100, 1)).toEqual('bytes=100-100');
  });
});
