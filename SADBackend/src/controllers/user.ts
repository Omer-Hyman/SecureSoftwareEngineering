import { Request, Response, NextFunction } from "express";
import {
  User,
  UserPaginate,
  BaseExcludes as UserBaseExcludes,
  GenerateBaseExcludes,
} from "../models/user";
import { AggregatePaginateModel, isValidObjectId } from "mongoose";
import { IRole, IUser } from "../interfaces/user";
import { GenerateAPIResult, GoThroughJSONAndReplaceObjectIDs, HttpException, RecursiveRemoveUndefinedFields, RemoveUndefinedFieldsRoot, SecurityLog } from "../helpers";
import { GetUserByID_ControllerStage, GetUsersQuery, UserDecorated, UserPutRequest_ControllerStage, UserPutRequest_ValidationStage } from "../validation/user";
import bcrypt from "bcryptjs";
import { IAuthenticatedRequest } from "../interfaces/auth";
import { instanceToInstance, plainToInstance } from "class-transformer";
import Role from "../models/role";
// import {aggregate} from 'mongoose-aggregate-paginate-v2';

export default class UserController {
  public PostUser = async (req: Request, res: Response, next: NextFunction) => {
    const postRequest: UserDecorated = req.body;

    try {
      postRequest.password = await bcrypt.hash(req.body.password, 10);

      var rolesToInsert: IRole[] = [];

      if (postRequest.roles) {
        rolesToInsert = await Promise.all(postRequest.roles!.map(async (sr) => {
          const r = await Role.findOne({ name: sr })
          if (!r) {
            throw new HttpException(400, "One or more roles supplied do not exist");
          }
          return (r as IRole);
        }));
      }

      const userParsed: IUser = {
        username: postRequest.username,
        password: postRequest.password,
        address: postRequest.address,
        fullname: postRequest.fullname,
        roles: rolesToInsert,
      };
      const newUser = new User(userParsed);
      const user = await newUser.save();
      res.status(200).json(GenerateAPIResult(true, newUser._id, undefined));
    } catch (err) {
      next(err);
    }
  };

  public GetUsers = async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {

    var reqQuery: GetUsersQuery = plainToInstance(GetUsersQuery, (req['query'] as any), {});

    if (reqQuery.filter) {
      try {
        reqQuery.filter = JSON.parse((reqQuery.filter as unknown as string));
      } catch (err) {
        throw new HttpException(400, "Cannot convert the filter to a JSON object", undefined, err as Error);
      }
      GoThroughJSONAndReplaceObjectIDs(reqQuery.filter);
    }



    let aggregate_options = [];

    var temp = req.query.page;

    let page = 1;
    let limit = 20;

    if (reqQuery.page) {
      page = reqQuery.page;
    }

    if (reqQuery.limit) {
      limit = reqQuery.limit;
    }

    const options = {
      page,
      limit,
      collation: { locale: "en" },
      customLabels: {
        totalDocs: "totalResults",
        docs: "users",
      },
    };


    const excludeExceptions: string[] = [];

    const isAdmin = ((req.User! as IUser).roles! as IRole[]).find((r) => r.name == "Admin");

    if (isAdmin) {
      excludeExceptions.push("roles");
      excludeExceptions.push("address");
    }

    GenerateBaseExcludes("", excludeExceptions).forEach((element) => {
      aggregate_options.push({ $project: element });
    });

    if (isAdmin)
      aggregate_options.push({
        $lookup: {
          from: "roles",
          localField: "roles",
          foreignField: "_id",
          as: "roles",
        },
      });

    if (reqQuery.joinCourses) {
      aggregate_options.push({
        $lookup: {
          from: "courses",
          let: { "student_id": "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$$student_id", "$students"]
                }
              }
            }],
          as: "courses"
        }
      });
      aggregate_options.push({ $project: { "courses.students": 0 } });
    };

    if (reqQuery.filter) aggregate_options.push({ $match: reqQuery.filter });

    // if(!isAdmin){
    //   //get only users who are part of the current staff member's course or module?
    // }

    const myAggregate = UserPaginate.aggregate(aggregate_options);

    UserPaginate.aggregatePaginate(myAggregate, options)
      .then((result) => res.status(200).json(GenerateAPIResult(true, result)))
      .catch((err) => {
        next(new HttpException(500, "Failed to fetch users", undefined, err));
      });
  };

  public GetUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      //var params: GetUserByID_Stage2 = (req as any)["params"];

      var params: GetUserByID_ControllerStage = plainToInstance(GetUserByID_ControllerStage, (req as any)["params"], {});

      // if (!isValidObjectId(params.id)) {
      //   throw new HttpException(400, "ID is not in the valid format");
      // }

      const user = await User.findById(
        params.id,
        { password: 0 },
        { populate: "roles" }
      );

      if (!user) throw new HttpException(400, "User not found");

      res.status(200).json(GenerateAPIResult(true, user, undefined));

    } catch (err) {
      next(err);
    }
  };

  public UpdateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const putRequest: UserPutRequest_ControllerStage = plainToInstance(UserPutRequest_ControllerStage, req.body, {});
      const params: GetUserByID_ControllerStage = plainToInstance(GetUserByID_ControllerStage, (req as any)["params"], {});

      if ((putRequest.address) == undefined && (putRequest.fullname == undefined) && (putRequest.roles == undefined)) {
        throw new HttpException(400, "Put request contains no data to update");
      }
      var deltaObj = RemoveUndefinedFieldsRoot(putRequest);

      //check if id exists so failure can be 500?

      const updateRes = await User.updateOne({ _id: params.id }, deltaObj);

      if (updateRes.modifiedCount != 1) throw new HttpException(400, "Failed to update");


      const newUser = await User.findById(params.id, { password: 0 }, { populate: "roles" });
      if (!newUser) throw new HttpException(400, "Failed to find user and/or update");

      res.status(200).json(GenerateAPIResult(true, newUser, undefined));


    }
    catch (err) {
      next(err);
    }
  };

  public DeleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params: GetUserByID_ControllerStage = (req as any)["params"];
      if (!isValidObjectId(params.id)) {
        throw new HttpException(400, "ID is not in the valid format");
      }

      //check if id exists so failure can be 500?

      const deleteRes = await User.deleteOne({ _id: params.id });

      if (deleteRes.deletedCount != 1) throw new HttpException(400, "Failed to delete");

      SecurityLog("User deleted", params.id.toString());
      res.status(200).json(GenerateAPIResult(true, "Deleted", undefined));


    } catch (err) {
      next(err);
    }
  };

  public GetCurrentUser = async (req: IAuthenticatedRequest, res: Response, next: NextFunction) => {
    var returnObj = { username: (req.User! as IUser).username, roles: (req.User! as IUser).roles.map((r) => (r as IRole).name), fullname: (req.User! as IUser).fullname, address: (req.User! as IUser).address };
    res.status(200).json(GenerateAPIResult(true, returnObj));
  };
}
