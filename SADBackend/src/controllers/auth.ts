import { User } from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { GenerateAPIResult, HttpException, SecurityLog } from '../helpers';
import { Request, Response, NextFunction } from 'express';
import { LoginRequest } from '../validation/auth';
import { IRole } from '../interfaces/user';


export default class AuthController{

    public login = async (req: Request, res: Response, next: NextFunction) => {

        const { SECRET } = process.env;
        try{
            if (!SECRET) {
                next(new HttpException(500, "Internal server error", undefined, new Error("SECRET .env value undefined")));
                return;
            }

            const loginRequest: LoginRequest = req.body;
            const user = await User.findOne({username: loginRequest.username}).populate("roles");
            if(user){
                const passwordMatch = await bcrypt.compare(loginRequest.password, user.password);
                if(passwordMatch){
                    const token = await jwt.sign({UserID: user._id.toString()}, SECRET, {
                        expiresIn: "2h",
                    });

                    const decoded = jwt.decode(token, {complete: true});
                    res.status(200).json(GenerateAPIResult(true, {token: token, expiry: (decoded!.payload as jwt.JwtPayload).exp, roles: user.roles.map((r) => (r as IRole).name)}))
                    SecurityLog("logged in successfully", loginRequest.username);
                } else{
                    SecurityLog("failed to log in", loginRequest.username);
                    throw new HttpException(409, "Details are incorrect");
                }
            } else{
                SecurityLog("failed to log in", loginRequest.username);
                throw new HttpException(409, "Details are incorrect");
            }
        } catch(error){
            next(error);
        }
    }
}

// exports.login = async (req, res) => {
//   try {
//     // check if the user exists
//     const user = await User.findOne({ username: req.body.username });
//     if (user) {
//       //check if password matches
//       const result = await bcrypt.compare(req.body.password, user.password);
//       if (result) {
//         // sign token with id and a random salt and send it in response
//         // const array = new Uint32Array(10);
//         // crypto.getRandomValues(array);

//         //generate a salt and store in a cache (redis?) as an additional measure incase the secret is exposed? Then check the salt againt cache.
//         const token = await jwt.sign({ userId: user._id}, SECRET, {
//           expiresIn: "2h",
//         });

//         var decoded = await jwt.decode(token, { complete: true });

//         res.json(
//           respGen.generateResult(
//             true,
//             { token, expiry: decoded.payload.exp },
//             null
//           )
//         );
//       } else {
//         res
//           .status(400)
//           .json(respGen.generateResult(false, null, "Details are incorrect"));
//       }
//     } else {
//       res
//         .status(400)
//         .json(respGen.generateResult(false, null, "Details are incorrect"));
//     }
//   } catch (error) {
//     res
//       .status(400)
//       .json(respGen.generateResult(false, null, "Details are incorrect"));
//   }
// };
