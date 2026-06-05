export declare const CTX: {
    CustomerId: "customerId";
    RequestId: "requestId";
};
export interface AppClsStore {
    [CTX.CustomerId]?: number;
    [CTX.RequestId]?: string;
}
