export type TravellerDispatchInput = {
  travellerId: string;
  messageText: string;
};

export async function dispatchTravellerMessage(_input: TravellerDispatchInput): Promise<void> {
  void _input;

  throw new Error("Not implemented yet");
}
