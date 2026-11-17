export type NewsItem={title:string;description:string;url:string;published:string;category:'Rules & legality'|'Game news'};
export type CatalogChange={at:string;added:string[];corrected:string[];addedCount:number;correctedCount:number;kind:'refresh'|'rollback'};
export type UpdateStatus={checkedAt:string|null;catalogSuccessAt:string|null;catalogUpdated:string;newsCheckedAt:string|null;catalogError:string|null;newsError:string|null;news:NewsItem[];changes:CatalogChange[];printings:number;sets:number;canRollback:boolean;busy?:boolean};
