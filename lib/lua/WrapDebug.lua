require('torch')
require('nn')

local WrapDebug, parent = torch.class('nn.WrapDebug', 'nn.Container')

function WrapDebug:__init(m, name)
    parent.__init(self)

    -- Store the module and name
    self.module = m
    self.name = name

    -- so that it can be handled like a Container
    self:add(self.module)

    -- Create an output table with at least a fixed Tensor
    self.output = {torch.Tensor()}

    -- Store a reference back to the training-script object
    self.trainingScript = trainingScript
end


function WrapDebug:updateOutput(input)
    print(self.name .. " input")
    print(input)
    self.output = self.module:updateOutput(input)
    print(self.name .. " output")
    print(self.output)
    return self.output
end

function WrapDebug:updateGradInput(input, gradOutput)
    self.gradInput = self.module:updateGradInput(input, gradOutput)
    return self.gradInput
end

function WrapDebug:accGradParameters(input, gradOutput, scale)
    self.module:accGradParameters(input, gradOutput, scale)
end

function WrapDebug:accUpdateGradParameters(input, gradOutput, lr)
    self.module:accUpdateGradParameters(input, gradOutput, lr)
end

function WrapDebug:sharedAccUpdateGradParameters(input, gradOutput, lr)
    self.module:sharedAccUpdateGradParameters(input, gradOutput, lr)
end

function WrapDebug:__tostring__()
    if self.module.__tostring__ then
        return torch.type(self) .. ' @ ' .. self.module:__tostring__()
    else
        return torch.type(self) .. ' @ ' .. torch.type(self.module)
    end
end

