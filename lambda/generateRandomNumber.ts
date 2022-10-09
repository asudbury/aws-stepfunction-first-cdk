exports.handler = (
  event: {
    maxNumber: number;
    numberToCheck: string;
  },
  context: any,
  callback: (
    arg0: null,
    arg1: {
      generatedRandomNumber: number;
      maxNumber: number;
      numberToCheck: number;
    }
  ) => void
) => {
  console.log('generatedRandomNumber');
  console.log('maxNumber', event.maxNumber);
  console.log('numberToCheck', event.numberToCheck);

  const generateRandom = (maxNumber: number) =>
    Math.floor(Math.random() * maxNumber) + 1;

  const randomNumber = generateRandom(event.maxNumber);

  console.log('randomNumber', randomNumber);

  callback(null, {
    generatedRandomNumber: randomNumber,
    maxNumber: event.maxNumber,
    numberToCheck: parseInt(event.numberToCheck),
  });
};
