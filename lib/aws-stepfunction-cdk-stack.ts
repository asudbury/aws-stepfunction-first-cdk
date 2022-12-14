import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsStepfunctionCdkStack extends Stack {
  private Machine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const runtime = lambda.Runtime.NODEJS_14_X;

    // Lambda to generate a random number
    const generateRandomNumber = new lambda.Function(
      this,
      'RandomNumberGenerator',
      {
        runtime: runtime,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'generateRandomNumber.handler',
        timeout: Duration.seconds(3),
      }
    );

    // Lambda invocation for generating a random number
    const generateRandomNumberInvocation = new tasks.LambdaInvoke(
      this,
      'Generate random number invocation',
      {
        lambdaFunction: generateRandomNumber,
        outputPath: '$.Payload',
      }
    );

    // Lambda function called if the generated number is greater than the expected number
    const functionGreaterThan = new lambda.Function(this, 'NumberGreaterThan', {
      runtime: runtime,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'greater.handler',
      timeout: Duration.seconds(3),
    });

    // Lambda invocation if the generated number is greater than the expected number
    const greaterThanInvocation = new tasks.LambdaInvoke(
      this,
      'Get Number is greater than invocation',
      {
        lambdaFunction: functionGreaterThan,
        inputPath: '$',
        outputPath: '$',
      }
    );

    // Lambda function called if the generated number is less than or equal to the expected number
    const functionLessThanOrEqual = new lambda.Function(
      this,
      'NumberLessThan',
      {
        runtime: runtime,
        code: lambda.Code.fromAsset('lambda'),
        handler: 'lessOrEqual.handler',
        timeout: Duration.seconds(3),
      }
    );

    // Lambda invocation if the generated number is less than or equal to the expected number
    const lessThanOrEqualInvocation = new tasks.LambdaInvoke(
      this,
      'Get Number is less than or equal invocation',
      {
        lambdaFunction: functionLessThanOrEqual,
        inputPath: '$',
        outputPath: '$',
      }
    );

    // Condition to wait 1 second
    const wait1Second = new sfn.Wait(this, 'Wait 1 Second', {
      time: sfn.WaitTime.duration(Duration.seconds(1)),
    });

    // Choice condition for workflow
    const numberChoice = new sfn.Choice(this, 'Job Complete?')
      .when(
        sfn.Condition.numberGreaterThanJsonPath(
          '$.generatedRandomNumber',
          '$.numberToCheck'
        ),
        greaterThanInvocation
      )
      .when(
        sfn.Condition.numberLessThanEqualsJsonPath(
          '$.generatedRandomNumber',
          '$.numberToCheck'
        ),
        lessThanOrEqualInvocation
      )
      .otherwise(lessThanOrEqualInvocation);

    // Create the workflow definition
    const definition = generateRandomNumberInvocation
      .next(wait1Second)
      .next(numberChoice);

    // Create the statemachine
    this.Machine = new sfn.StateMachine(this, 'StateMachine', {
      definition,
      stateMachineName: 'randomNumberStateMachine',
      timeout: Duration.minutes(5),
    });

    // Grab the state machine arn
    const stateMachineArn = this.Machine.stateMachineArn;

    // Grab the role for the api gateway
    const credentialsRole = new iam.Role(this, 'getRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    // Attach an inline policy for the statemachine arn to the credentials role
    credentialsRole.attachInlinePolicy(
      new iam.Policy(this, 'getPolicy', {
        statements: [
          new iam.PolicyStatement({
            actions: ['states:StartExecution'],
            effect: iam.Effect.ALLOW,
            resources: [stateMachineArn],
          }),
        ],
      })
    );

    // Create an api gateway rest api
    const apiEndPoint = new apigateway.RestApi(this, 'endpoint');

    // Create a method for invoking the step function via the api gateway
    apiEndPoint.root.addMethod(
      'GET',
      new apigateway.AwsIntegration({
        service: 'states',
        action: 'StartExecution',
        integrationHttpMethod: 'POST',
        options: {
          credentialsRole,
          integrationResponses: [
            {
              statusCode: '200',
              responseTemplates: {
                'application/json': `{"done": true}`,
              },
            },
          ],
        },
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      }
    );
  }
}
