import { describe, expect, it, vi } from "vitest";
import { ApiError, type Transport } from "./http";
import { SessionManager, type Session } from "./session";
import { authorizedWorkspaces } from "./workspaces";

const session: Session = { accessToken:"a".repeat(40),refreshToken:"r".repeat(80),accessExpiresAt:new Date(Date.now()+3600000).toISOString(),user:{ id:"237c702d-f464-4e19-bd1f-8b02a575180a",roles:["customer","rider"] } };
const store = () => ({ read:vi.fn().mockResolvedValue("old".repeat(30)),write:vi.fn().mockResolvedValue(undefined),clear:vi.fn().mockResolvedValue(undefined) });
describe("shared mobile session",()=>{
  it("shares one rotation across concurrent callers",async ()=>{
    const send=vi.fn().mockResolvedValue(session),secrets=store(),manager=new SessionManager(send as Transport,secrets);
    const [first,second]=await Promise.all([manager.restore(),manager.restore()]);
    expect(first).toEqual(session);expect(second).toEqual(session);
    expect(send).toHaveBeenCalledOnce();expect(secrets.write).toHaveBeenCalledOnce();
  });
  it("clears a revoked session but preserves credentials on a temporary outage",async ()=>{
    const secrets=store();
    const offline=new SessionManager(vi.fn().mockRejectedValue(new ApiError(503,"UNAVAILABLE","offline")) as Transport,secrets);
    await expect(offline.restore()).rejects.toMatchObject({ status:503 });expect(secrets.clear).not.toHaveBeenCalled();
    const revoked=new SessionManager(vi.fn().mockRejectedValue(new ApiError(401,"REVOKED","sign in")) as Transport,secrets);
    await expect(revoked.restore()).rejects.toMatchObject({ status:401 });expect(secrets.clear).toHaveBeenCalledOnce();
  });
  it("finishes a rotation before sign-out and revokes the replacement session",async ()=>{
    let finish!: (value:Session)=>void;
    const send=vi.fn().mockImplementationOnce(()=>new Promise<Session>((resolve)=>{finish=resolve;})).mockResolvedValue({ revoked:true });
    const secrets=store(),manager=new SessionManager(send as Transport,secrets);
    const restoring=manager.restore();
    await Promise.resolve();
    const exiting=manager.logout();
    finish(session);await restoring;await exiting;
    expect(manager.snapshot()).toBeNull();
    expect(send).toHaveBeenLastCalledWith("/identity/sessions/logout",{ method:"POST",token:session.accessToken,body:{} });
    expect(secrets.clear).toHaveBeenCalledOnce();
  });
  it("does not show staff or unassigned workspaces",()=>{
    expect(authorizedWorkspaces(["customer","staff","unknown"]).map((item)=>item.role)).toEqual(["customer"]);
    expect(authorizedWorkspaces(["staff"])).toEqual([]);
  });
});
