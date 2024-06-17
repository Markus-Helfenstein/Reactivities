using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MediatR;

namespace Application.Core
{
    public class Result<T>
    {
        public bool IsSuccess { get; set; }
        public T Value { get; set; }
        public string Error { get; set; }
    }

    public static class Result
    {
        public static Result<T> Success<T>(T value) => new Result<T> { IsSuccess = true, Value = value };
        public static Result<T> Failure<T>(string error) => new Result<T> { IsSuccess = false, Error = error };
        public static Result<Unit> Failure(string error) => Failure<Unit>(error);

        public static Result<T> HandleSaveChanges<T>(int affectedRows, T successValue, string errorMessage)
        {
            if (0 == affectedRows) 
            {
                return Failure<T>(errorMessage);
            }
            
            return Success(successValue);
        }

        public static Result<Unit> HandleSaveChanges(int affectedRows, string errorMessage)
        {
            return HandleSaveChanges(affectedRows, Unit.Value, errorMessage);
        }
    }
}