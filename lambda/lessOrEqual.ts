exports.handler = (
  event: any,
  context: any,
  callback: (arg0: null, arg1: { msg: string }) => void
) => {
  console.log('lessOrEqual');
  callback(null, { msg: 'lessOrEqual' });
};
