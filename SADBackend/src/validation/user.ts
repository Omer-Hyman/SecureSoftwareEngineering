import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean } from "class-validator";
import { Schema } from "mongoose";
import "reflect-metadata";
import { IAddress, IFullname, IRole, IUser } from "../interfaces/user";

export class GetUsersQuery{
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    page?: number;
    @IsInt()
    @IsOptional()
    @Type(() => Number)
    limit?: number;
}

export class FullNameDecorated implements IFullname{
    @IsString()
    firstname!: string;
    @IsString()
    @IsOptional()
    middlenames?: string;
    @IsString()
    lastname!: string;
  
  }
  
export class AddressDecorated implements IAddress{
    @IsString()
    addressLine1!: string;
    @IsString()
    @IsOptional()
    addressLine2?: string | undefined;
    @IsString()
    @IsOptional()
    addressLine3?: string | undefined;
    @IsString()
    @IsOptional()
    addressLine4?: string | undefined;
    @IsString()
    postcode!: string;
    @IsString()
    city!: string;
    @IsString()
    country!: string;
}

export class UserDecorated{
    @IsString()
    @IsNotEmpty()
    username!: string;
    @IsString()
    password!: string;
    @IsNotEmpty()
    fullname!: FullNameDecorated;
    @IsNotEmpty()
    address!: AddressDecorated;

}

export class GetUserByID{
    @IsString()
    @IsNotEmpty()
    id!: string;
}

