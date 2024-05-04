import {Asset} from './my_asset';

@Info({title: 'AssetTransfer', description: 'Smart contract for exchanging automotive information'})
export class AssetTransferContract extends Contract {

    public docType?: string;

    @Property()
    public ID: string;

    @Property()
    public Payload: string;

    @Property()
    public Owner: string;

    @Property()
    public ValueConsideration: number;

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const assets: Asset[] = [
            {
                ID: 'asset1',
                Payload: '{"in_vehicle_data":"{"vehicle_make":"X5", "GPS":"256 88 46"}"}',
                Owner: 'BMW',
                ValueConsideration: 300,
            },
            {
                ID: 'asset2',
                Payload: '{"in_vehicle_data":"{"vehicle_make":"S8", "GPS":"711 11 43"}"}',
                Owner: 'Audi',
                ValueConsideration: 400,
            },
            {
                ID: 'asset3',
                Payload: '{"in_vehicle_data":"{"vehicle_make":"Astra", "GPS":"211 22 30"}"}',
                Owner: 'Opel',
                ValueConsideration: 800,
            },
        ];

        for (const asset of assets) {
            asset.docType = 'asset';
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
            console.info(`Asset ${asset.ID} initialized`);
        }
    }

    @Transaction()
    public async CreateAsset(ctx: Context, id: string, payload: string, owner: string, valueconsideration: number): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            ID: id,
            Payload: payload,
            Owner: owner,
            ValueConsideration: valueconsideration,
        };
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
    }

    @Transaction(false)
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    @Transaction()
    public async UpdateAsset(ctx: Context, id: string, payload: string , owner: string, valueconsideration: number): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }

        const updatedAsset = {
            ID: id,
            Payload: payload,
            Owner: owner,
            ValueConsideration: valueconsideration,
        };
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedAsset))));
    }

    @Transaction()
    public async DeleteAsset(ctx: Context, id: string): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (!exists) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    @Transaction()
    public async TransferAsset(ctx: Context, id: string, newOwner: string): Promise<string> {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);
        const oldOwner = asset.Owner;
        asset.Owner = newOwner;
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return oldOwner;
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

}
